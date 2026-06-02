from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    default_model: str = "anthropic/claude-3.5-sonnet"
    fallback_model: str = "openai/gpt-4o"
    embedding_model: str = "all-MiniLM-L6-v2"
    intent_model: str = "all-mpnet-base-v2"

    database_url: str = "sqlite+aiosqlite:///./reasonedai.db"
    redis_url: str = "redis://localhost:6379/0"

    secret_key: str = "dev-secret-change-in-production"
    access_token_expire_minutes: int = 1440
    algorithm: str = "HS256"

    allowed_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    storage_path: str = "./storage"
    max_upload_size_mb: int = 100
    ocr_enabled: bool = True
    tesseract_cmd: str = "/usr/bin/tesseract"

    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"

    chroma_host: str = "localhost"
    chroma_port: int = 8001

    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    environment: str = "development"
    log_level: str = "INFO"
    mock_llm: bool = False

    @property
    def storage_dir(self) -> Path:
        p = Path(self.storage_path)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def chunks_file(self) -> Path:
        return self.storage_dir / "chunks.json"

    @property
    def files_meta_path(self) -> Path:
        return self.storage_dir / "files_meta.json"

    @property
    def embeddings_file(self) -> Path:
        return self.storage_dir / "embeddings.npy"

    @property
    def faiss_index_path(self) -> Path:
        return self.storage_dir / "faiss.index"

    @property
    def uploads_dir(self) -> Path:
        p = self.storage_dir / "uploads"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def dfs_dir(self) -> Path:
        p = self.storage_dir / "dfs"
        p.mkdir(parents=True, exist_ok=True)
        return p


@lru_cache()
def get_settings() -> Settings:
    return Settings()
