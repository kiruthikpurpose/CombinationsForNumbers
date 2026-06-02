import json
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger

from app.config import get_settings
from app.core.embeddings import EmbeddingService

settings = get_settings()


class VectorStoreService:
    _instance: Optional["VectorStoreService"] = None
    _index = None
    _metadata: List[Dict[str, Any]] = []

    @classmethod
    async def initialize(cls):
        if cls._instance is None:
            inst = cls()
            await inst._load_or_create_index()
            cls._instance = inst
            logger.info("VectorStoreService initialized")

    @classmethod
    def get(cls) -> "VectorStoreService":
        if cls._instance is None:
            raise RuntimeError("VectorStoreService not initialized")
        return cls._instance

    async def _load_or_create_index(self):
        try:
            import faiss
            embedding_svc = EmbeddingService.get()
            dim = embedding_svc.embedding_dim

            if settings.faiss_index_path.exists():
                self._index = faiss.read_index(str(settings.faiss_index_path))
                logger.info(f"Loaded FAISS index with {self._index.ntotal} vectors")
            else:
                self._index = faiss.IndexFlatIP(dim)
                logger.info(f"Created new FAISS index (dim={dim})")

            meta_path = settings.storage_dir / "vector_meta.json"
            if meta_path.exists():
                with open(meta_path) as f:
                    self._metadata = json.load(f)
        except ImportError:
            logger.warning("FAISS not available. Vector search will be disabled.")
            self._index = None

    def add_vectors(self, embeddings: np.ndarray, metadata_list: List[Dict[str, Any]]):
        if self._index is None:
            return
        try:
            import faiss
            vectors = embeddings.astype(np.float32)
            if vectors.ndim == 1:
                vectors = vectors.reshape(1, -1)
            self._index.add(vectors)
            self._metadata.extend(metadata_list)
            self._save()
        except Exception as e:
            logger.error(f"Failed to add vectors: {e}")

    def search(self, query_embedding: np.ndarray, top_k: int = 10, min_score: float = 0.0) -> List[Tuple[Dict[str, Any], float]]:
        if self._index is None or self._index.ntotal == 0:
            return []

        try:
            query = query_embedding.astype(np.float32).reshape(1, -1)
            scores, indices = self._index.search(query, min(top_k, self._index.ntotal))
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx == -1:
                    continue
                normalized_score = float(score)
                if normalized_score >= min_score and idx < len(self._metadata):
                    results.append((self._metadata[idx], normalized_score))
            return results
        except Exception as e:
            logger.error(f"Vector search error: {e}")
            return []

    def remove_by_document_id(self, document_id: str):
        if self._index is None:
            return
        try:
            import faiss
            keep_indices = [i for i, m in enumerate(self._metadata) if m.get("document_id") != document_id]
            if len(keep_indices) == len(self._metadata):
                return

            embedding_svc = EmbeddingService.get()
            new_index = faiss.IndexFlatIP(embedding_svc.embedding_dim)
            kept_meta = []

            if keep_indices and hasattr(self._index, 'reconstruct'):
                vectors = np.array([self._index.reconstruct(i) for i in keep_indices])
                new_index.add(vectors)
                kept_meta = [self._metadata[i] for i in keep_indices]

            self._index = new_index
            self._metadata = kept_meta
            self._save()
            logger.info(f"Removed vectors for document {document_id}")
        except Exception as e:
            logger.error(f"Failed to remove vectors: {e}")

    def _save(self):
        try:
            import faiss
            faiss.write_index(self._index, str(settings.faiss_index_path))
            meta_path = settings.storage_dir / "vector_meta.json"
            with open(meta_path, "w") as f:
                json.dump(self._metadata, f)
        except Exception as e:
            logger.error(f"Failed to save vector index: {e}")

    @property
    def total_vectors(self) -> int:
        return self._index.ntotal if self._index else 0
