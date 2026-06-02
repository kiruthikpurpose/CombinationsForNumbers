from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import Document, KnowledgeUnit, ReasoningQuery, AgentBlueprint, Report, AuditLog, User
from app.schemas.schemas import PlatformStatsResponse
from app.core.security import get_current_superuser

router = APIRouter()


@router.get("/stats", response_model=PlatformStatsResponse)
async def get_platform_stats(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_superuser)):
    total_docs = (await db.execute(select(func.count(Document.id)))).scalar() or 0
    processed_docs = (await db.execute(select(func.count(Document.id)).where(Document.status == "processed"))).scalar() or 0
    total_units = (await db.execute(select(func.count(KnowledgeUnit.id)))).scalar() or 0
    total_queries = (await db.execute(select(func.count(ReasoningQuery.id)))).scalar() or 0
    total_agents = (await db.execute(select(func.count(AgentBlueprint.id)))).scalar() or 0
    total_reports = (await db.execute(select(func.count(Report.id)))).scalar() or 0
    avg_conf = (await db.execute(select(func.avg(ReasoningQuery.confidence_score)))).scalar() or 0.0

    format_result = await db.execute(select(Document.format, func.count(Document.id)).group_by(Document.format))
    docs_by_format = {row[0]: row[1] for row in format_result.all()}

    intent_result = await db.execute(select(ReasoningQuery.intent, func.count(ReasoningQuery.id)).group_by(ReasoningQuery.intent))
    queries_by_intent = {row[0]: row[1] for row in intent_result.all() if row[0]}

    recent_logs_result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(10)
    )
    recent_logs = recent_logs_result.scalars().all()

    return PlatformStatsResponse(
        total_documents=total_docs,
        processed_documents=processed_docs,
        total_knowledge_units=total_units,
        total_queries=total_queries,
        total_agents=total_agents,
        total_reports=total_reports,
        avg_confidence_score=round(float(avg_conf), 4),
        documents_by_format=docs_by_format,
        queries_by_intent=queries_by_intent,
        recent_activity=[
            {
                "action": log.action,
                "resource_type": log.resource_type,
                "created_at": log.created_at.isoformat(),
            }
            for log in recent_logs
        ],
    )


@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_superuser),
):
    query = select(User).order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()
    total = (await db.execute(select(func.count(User.id)))).scalar() or 0
    return {"items": [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role, "is_active": u.is_active, "created_at": u.created_at.isoformat()} for u in users], "total": total}


@router.get("/audit-logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_superuser),
):
    query = select(AuditLog).order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    logs = result.scalars().all()
    total = (await db.execute(select(func.count(AuditLog.id)))).scalar() or 0
    return {"items": [{"id": l.id, "action": l.action, "resource_type": l.resource_type, "resource_id": l.resource_id, "created_at": l.created_at.isoformat()} for l in logs], "total": total}
