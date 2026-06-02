import uuid
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import ReasoningQuery, Document, KnowledgeUnit
from app.schemas.schemas import (
    ReasoningRequest,
    ReasoningResponse,
    ReasoningStepResponse,
    EvidenceItem,
    ConfidenceBreakdown,
    FeedbackRequest,
)
from app.core.security import get_current_user
from app.core.embeddings import EmbeddingService
from app.core.vector_store import VectorStoreService
from app.core.confidence import ConfidenceEngine
from app.core.llm_client import get_llm_client

router = APIRouter()
confidence_engine = ConfidenceEngine()


@router.post("/query", response_model=ReasoningResponse)
async def run_reasoning_query(
    request: ReasoningRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    total_start = time.time()
    llm = get_llm_client()

    intent = await llm.classify_intent(request.query)

    embedding_svc = EmbeddingService.get()
    query_embedding = embedding_svc.embed_single(request.query)

    vector_store = VectorStoreService.get()
    raw_results = vector_store.search(query_embedding, top_k=15, min_score=0.0)

    evidence_chunks = []
    for meta, score in raw_results[:10]:
        unit_id = meta.get("unit_id")
        if not unit_id:
            continue
        unit_result = await db.execute(select(KnowledgeUnit).where(KnowledgeUnit.id == unit_id))
        unit = unit_result.scalar_one_or_none()
        if unit:
            doc_result = await db.execute(select(Document).where(Document.id == unit.document_id))
            doc = doc_result.scalar_one_or_none()
            evidence_chunks.append({
                "unit_id": unit_id,
                "document_id": unit.document_id,
                "document_name": doc.name if doc else "Unknown",
                "section_title": meta.get("section_title"),
                "content": unit.content,
                "unit_type": unit.unit_type,
                "page_number": meta.get("page_number"),
                "relevance_score": score,
                "tags": unit.tags or [],
            })

    if not evidence_chunks and request.document_ids:
        fallback_result = await db.execute(
            select(KnowledgeUnit).where(KnowledgeUnit.document_id.in_(request.document_ids)).limit(8)
        )
        units = fallback_result.scalars().all()
        for unit in units:
            doc_result = await db.execute(select(Document).where(Document.id == unit.document_id))
            doc = doc_result.scalar_one_or_none()
            evidence_chunks.append({
                "unit_id": unit.id,
                "document_id": unit.document_id,
                "document_name": doc.name if doc else "Unknown",
                "section_title": None,
                "content": unit.content,
                "unit_type": unit.unit_type,
                "page_number": None,
                "relevance_score": 0.4,
                "tags": unit.tags or [],
            })

    llm_result = await llm.generate_reasoning_response(
        query=request.query,
        intent=intent,
        evidence_chunks=evidence_chunks,
        reasoning_depth=request.reasoning_depth,
    )

    confidence_signals = confidence_engine.compute(
        query=request.query,
        retrieved_chunks=evidence_chunks,
        intent=intent,
        answer=llm_result.get("answer", ""),
    )
    conf_dict = confidence_signals.to_dict()

    query_id = str(uuid.uuid4())
    reasoning_trace = []
    for step_data in llm_result.get("reasoning_trace", []):
        reasoning_trace.append(
            ReasoningStepResponse(
                step_number=step_data.get("step", 1),
                layer=step_data.get("layer", "informational"),
                action=step_data.get("action", ""),
                result=step_data.get("result", ""),
                evidence_used=[],
                confidence=step_data.get("confidence", conf_dict["overall"]),
            )
        )

    evidence_items = []
    if request.include_evidence:
        for chunk in evidence_chunks:
            evidence_items.append(
                EvidenceItem(
                    document_id=chunk["document_id"],
                    document_name=chunk["document_name"],
                    section_title=chunk.get("section_title"),
                    content=chunk["content"][:500] + "..." if len(chunk["content"]) > 500 else chunk["content"],
                    page_number=chunk.get("page_number"),
                    relevance_score=chunk["relevance_score"],
                )
            )

    db_query = ReasoningQuery(
        id=query_id,
        user_id=current_user.id,
        query_text=request.query,
        intent=intent,
        document_scope=request.document_ids or [],
        retrieved_chunks=[c["unit_id"] for c in evidence_chunks],
        reasoning_trace=[s.model_dump() for s in reasoning_trace],
        final_answer=llm_result.get("answer", ""),
        confidence_score=conf_dict["overall"],
        confidence_breakdown=conf_dict,
        model_used=llm_result.get("model_used", ""),
        tokens_used=llm_result.get("tokens_used", 0),
        latency_ms=llm_result.get("latency_ms", 0),
    )
    db.add(db_query)

    return ReasoningResponse(
        query_id=query_id,
        query=request.query,
        intent=intent,
        answer=llm_result.get("answer", "No answer could be generated."),
        reasoning_trace=reasoning_trace,
        evidence=evidence_items,
        confidence=ConfidenceBreakdown(**conf_dict),
        model_used=llm_result.get("model_used", ""),
        latency_ms=llm_result.get("latency_ms", 0),
        tokens_used=llm_result.get("tokens_used", 0),
    )


@router.get("/history")
async def get_query_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    intent_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(ReasoningQuery).where(ReasoningQuery.user_id == current_user.id)
    if intent_filter:
        query = query.where(ReasoningQuery.intent == intent_filter)
    query = query.order_by(ReasoningQuery.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    queries = result.scalars().all()

    count_result = await db.execute(
        select(func.count(ReasoningQuery.id)).where(ReasoningQuery.user_id == current_user.id)
    )
    total = count_result.scalar()

    return {"items": [
        {
            "id": q.id,
            "query": q.query_text,
            "intent": q.intent,
            "confidence": q.confidence_score,
            "model_used": q.model_used,
            "latency_ms": q.latency_ms,
            "created_at": q.created_at.isoformat(),
            "feedback": q.feedback,
        }
        for q in queries
    ], "total": total, "page": page, "page_size": page_size}


@router.get("/{query_id}")
async def get_query(query_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(ReasoningQuery).where(ReasoningQuery.id == query_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Query not found")
    return q


@router.post("/feedback")
async def submit_feedback(
    feedback_req: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(ReasoningQuery).where(ReasoningQuery.id == feedback_req.query_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Query not found")
    q.feedback = feedback_req.feedback
    q.feedback_note = feedback_req.note
    return {"message": "Feedback recorded"}
