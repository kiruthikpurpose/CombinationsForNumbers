from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
import sys

from app.config import get_settings
from app.database import init_db
from app.api.v1 import documents, knowledge, reasoning, agents, reports, admin, auth, websocket

settings = get_settings()

logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level=settings.log_level,
    colorize=True,
)
logger.add("logs/reasonedai_{time}.log", rotation="100 MB", retention="30 days", level="DEBUG")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ReasonedAI platform...")
    await init_db()
    from app.core.embeddings import EmbeddingService
    await EmbeddingService.initialize()
    from app.core.vector_store import VectorStoreService
    await VectorStoreService.initialize()
    logger.info("All services initialized. ReasonedAI is ready.")
    yield
    logger.info("Shutting down ReasonedAI...")


app = FastAPI(
    title="ReasonedAI",
    description="Enterprise-grade document intelligence and reasoning platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(knowledge.router, prefix="/api/v1/knowledge", tags=["Knowledge"])
app.include_router(reasoning.router, prefix="/api/v1/reasoning", tags=["Reasoning"])
app.include_router(agents.router, prefix="/api/v1/agents", tags=["Agents"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.environment,
    }


@app.get("/")
async def root():
    return {"message": "ReasonedAI API", "docs": "/api/docs"}
