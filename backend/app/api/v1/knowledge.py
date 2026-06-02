import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import KnowledgeUnit, Document, DocumentSection
from app.schemas.schemas import (
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    KnowledgeSearchResult,
    KnowledgeUnitResponse,
)
from app.core.security import get_current_user
from app.core.embeddings import EmbeddingService
from app.core.vector_store import VectorStoreService

router = APIRouter()


@router.post("/search", response_model=KnowledgeSearchResponse)
async def search_knowledge(
    request: KnowledgeSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    start_time = time.time()

    from app.core.llm_client import get_llm_client
    llm = get_llm_client()
    intent = await llm.classify_intent(request.query)

    embedding_svc = EmbeddingService.get()
    query_embedding = embedding_svc.embed_single(request.query)

    vector_store = VectorStoreService.get()
    raw_results = vector_store.search(query_embedding, top_k=request.top_k * 2, min_score=request.min_score)

    unit_ids = [r[0].get("unit_id") for r in raw_results if r[0].get("unit_id")]
    score_map = {r[0].get("unit_id"): r[1] for r in raw_results}

    if not unit_ids:
        db_query = select(KnowledgeUnit)
        if request.document_ids:
            db_query = db_query.where(KnowledgeUnit.document_id.in_(request.document_ids))
        if request.unit_types:
            db_query = db_query.where(KnowledgeUnit.unit_type.in_(request.unit_types))
        db_query = db_query.limit(request.top_k)
        result = await db.execute(db_query)
        units = result.scalars().all()
        score_map = {u.id: 0.5 for u in units}
        unit_ids = [u.id for u in units]
    else:
        db_query = select(KnowledgeUnit).where(KnowledgeUnit.id.in_(unit_ids))
        if request.document_ids:
            db_query = db_query.where(KnowledgeUnit.document_id.in_(request.document_ids))
        if request.unit_types:
            db_query = db_query.where(KnowledgeUnit.unit_type.in_(request.unit_types))
        result = await db.execute(db_query)
        units = result.scalars().all()

    search_results = []
    for unit in units[:request.top_k]:
        doc_result = await db.execute(select(Document).where(Document.id == unit.document_id))
        doc = doc_result.scalar_one_or_none()

        section_title = None
        if unit.section_id:
            sec_result = await db.execute(select(DocumentSection).where(DocumentSection.id == unit.section_id))
            section = sec_result.scalar_one_or_none()
            if section:
                section_title = section.title

        search_results.append(
            KnowledgeSearchResult(
                unit=KnowledgeUnitResponse.model_validate(unit),
                relevance_score=round(score_map.get(unit.id, 0.5), 4),
                document_name=doc.name if doc else "Unknown",
                section_title=section_title,
            )
        )

    search_results.sort(key=lambda x: x.relevance_score, reverse=True)
    elapsed = int((time.time() - start_time) * 1000)

    return KnowledgeSearchResponse(
        query=request.query,
        intent=intent,
        results=search_results,
        total_results=len(search_results),
        search_time_ms=elapsed,
    )


@router.get("/units", response_model=List[KnowledgeUnitResponse])
async def list_knowledge_units(
    document_id: Optional[str] = Query(None),
    unit_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(KnowledgeUnit)
    if document_id:
        query = query.where(KnowledgeUnit.document_id == document_id)
    if unit_type:
        query = query.where(KnowledgeUnit.unit_type == unit_type)
    query = query.order_by(KnowledgeUnit.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/units/{unit_id}", response_model=KnowledgeUnitResponse)
async def get_knowledge_unit(unit_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(KnowledgeUnit).where(KnowledgeUnit.id == unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Knowledge unit not found")
    return unit


@router.post("/units/{unit_id}/validate", response_model=KnowledgeUnitResponse)
async def validate_knowledge_unit(unit_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(KnowledgeUnit).where(KnowledgeUnit.id == unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Knowledge unit not found")
    unit.is_validated = True
    unit.validated_by_id = current_user.id
    return unit


@router.get("/stats/summary")
async def knowledge_stats(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    total_result = await db.execute(select(func.count(KnowledgeUnit.id)))
    total = total_result.scalar()

    by_type_result = await db.execute(
        select(KnowledgeUnit.unit_type, func.count(KnowledgeUnit.id)).group_by(KnowledgeUnit.unit_type)
    )
    by_type = {row[0]: row[1] for row in by_type_result.all()}

    validated_result = await db.execute(
        select(func.count(KnowledgeUnit.id)).where(KnowledgeUnit.is_validated == True)
    )
    validated = validated_result.scalar()

    avg_conf_result = await db.execute(select(func.avg(KnowledgeUnit.confidence_score)))
    avg_conf = avg_conf_result.scalar() or 0.0

    vector_store = VectorStoreService.get()

    return {
        "total_units": total,
        "validated_units": validated,
        "by_type": by_type,
        "avg_confidence": round(float(avg_conf), 4),
        "total_vectors": vector_store.total_vectors,
    }
