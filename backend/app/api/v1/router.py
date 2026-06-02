from fastapi import APIRouter
from app.api.v1 import auth, documents, knowledge, reasoning, agents, reports, admin, websocket

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["Knowledge"])
api_router.include_router(reasoning.router, prefix="/reasoning", tags=["Reasoning"])
api_router.include_router(agents.router, prefix="/agents", tags=["Agents"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administration"])
api_router.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])
