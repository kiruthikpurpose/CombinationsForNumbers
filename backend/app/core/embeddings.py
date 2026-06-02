from typing import Optional, List
import numpy as np
from loguru import logger

_model = None
_intent_model = None


class EmbeddingService:
    _instance: Optional["EmbeddingService"] = None

    def __init__(self, model_name: str = "all-MiniLM-L6-v2", intent_model_name: str = "all-mpnet-base-v2"):
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer(model_name)
        self.intent_model = SentenceTransformer(intent_model_name)
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
        logger.info(f"Embedding models loaded. Dim: {self.embedding_dim}")

    @classmethod
    async def initialize(cls):
        from app.config import get_settings
        settings = get_settings()
        if cls._instance is None:
            try:
                cls._instance = cls(settings.embedding_model, settings.intent_model)
                logger.info("EmbeddingService initialized")
            except Exception as e:
                logger.warning(f"Failed to load embedding models: {e}. Using mock embeddings.")
                cls._instance = MockEmbeddingService()

    @classmethod
    def get(cls) -> "EmbeddingService":
        if cls._instance is None:
            raise RuntimeError("EmbeddingService not initialized. Call initialize() first.")
        return cls._instance

    def embed(self, texts: List[str], batch_size: int = 64) -> np.ndarray:
        if not texts:
            return np.array([])
        return self.model.encode(texts, batch_size=batch_size, show_progress_bar=False, normalize_embeddings=True)

    def embed_single(self, text: str) -> np.ndarray:
        return self.model.encode([text], normalize_embeddings=True)[0]

    def embed_for_intent(self, text: str) -> np.ndarray:
        return self.intent_model.encode([text], normalize_embeddings=True)[0]

    def compute_similarity(self, query_embedding: np.ndarray, doc_embeddings: np.ndarray) -> np.ndarray:
        if len(doc_embeddings) == 0:
            return np.array([])
        query_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-8)
        doc_norms = doc_embeddings / (np.linalg.norm(doc_embeddings, axis=1, keepdims=True) + 1e-8)
        return np.dot(doc_norms, query_norm)


class MockEmbeddingService(EmbeddingService):
    def __init__(self):
        self.embedding_dim = 384
        logger.warning("Using MockEmbeddingService — no real embeddings will be generated")

    def embed(self, texts: List[str], batch_size: int = 64) -> np.ndarray:
        return np.random.rand(len(texts), self.embedding_dim).astype(np.float32)

    def embed_single(self, text: str) -> np.ndarray:
        return np.random.rand(self.embedding_dim).astype(np.float32)

    def embed_for_intent(self, text: str) -> np.ndarray:
        return np.random.rand(self.embedding_dim).astype(np.float32)
