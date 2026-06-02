import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import Report, Document, KnowledgeUnit, ReasoningQuery
from app.schemas.schemas import ReportCreateRequest, ReportResponse
from app.core.security import get_current_user

router = APIRouter()


async def _build_assessment_report(document_ids: List[str], db: AsyncSession) -> dict:
    content = {
        "sections": [],
        "summary": {},
        "knowledge_breakdown": {},
        "recommendations": [],
    }

    for doc_id in document_ids:
        doc_result = await db.execute(select(Document).where(Document.id == doc_id))
        doc = doc_result.scalar_one_or_none()
        if not doc:
            continue

        units_result = await db.execute(select(KnowledgeUnit).where(KnowledgeUnit.document_id == doc_id))
        units = units_result.scalars().all()

        by_type = {}
        for unit in units:
            by_type.setdefault(unit.unit_type, []).append(unit.content[:200])

        content["sections"].append({
            "document_id": doc_id,
            "document_name": doc.name,
            "format": doc.format,
            "status": doc.status,
            "knowledge_unit_count": len(units),
            "by_type": {k: len(v) for k, v in by_type.items()},
            "sample_units": {k: v[:2] for k, v in by_type.items()},
        })

    total_units_result = await db.execute(
        select(func.count(KnowledgeUnit.id)).where(KnowledgeUnit.document_id.in_(document_ids))
    )
    content["summary"] = {
        "documents_analyzed": len(document_ids),
        "total_knowledge_units": total_units_result.scalar() or 0,
        "report_generated_at": __import__("datetime").datetime.utcnow().isoformat(),
    }

    return content


async def _build_compliance_report(document_ids: List[str], db: AsyncSession) -> dict:
    content = {"findings": [], "gaps": [], "compliant_areas": [], "risk_matrix": []}

    for doc_id in document_ids:
        doc_result = await db.execute(select(Document).where(Document.id == doc_id))
        doc = doc_result.scalar_one_or_none()
        if not doc:
            continue

        risks_result = await db.execute(
            select(KnowledgeUnit).where(
                KnowledgeUnit.document_id == doc_id,
                KnowledgeUnit.unit_type == "risk",
            )
        )
        risks = risks_result.scalars().all()

        reqs_result = await db.execute(
            select(KnowledgeUnit).where(
                KnowledgeUnit.document_id == doc_id,
                KnowledgeUnit.unit_type == "requirement",
            )
        )
        reqs = reqs_result.scalars().all()

        for risk in risks:
            content["risk_matrix"].append({
                "document": doc.name,
                "risk": risk.content[:300],
                "confidence": risk.confidence_score,
                "validated": risk.is_validated,
            })

        if reqs:
            content["compliant_areas"].append({
                "document": doc.name,
                "requirements_identified": len(reqs),
                "validated": sum(1 for r in reqs if r.is_validated),
            })

    return content


@router.post("/", response_model=ReportResponse, status_code=201)
async def create_report(
    request: ReportCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    for doc_id in request.document_ids:
        result = await db.execute(select(Document).where(Document.id == doc_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")

    if request.report_type == "assessment":
        content = await _build_assessment_report(request.document_ids, db)
    elif request.report_type == "compliance":
        content = await _build_compliance_report(request.document_ids, db)
    else:
        content = {"type": request.report_type, "document_ids": request.document_ids, "note": "Custom report type"}

    summary_lines = []
    if "summary" in content:
        s = content["summary"]
        summary_lines.append(f"Analyzed {s.get('documents_analyzed', len(request.document_ids))} document(s).")
        if "total_knowledge_units" in s:
            summary_lines.append(f"Extracted {s['total_knowledge_units']} knowledge units.")

    report = Report(
        id=str(uuid.uuid4()),
        title=request.title,
        report_type=request.report_type,
        document_ids=request.document_ids,
        query_id=request.query_id,
        content=content,
        summary=" ".join(summary_lines) if summary_lines else None,
        format=request.format,
        created_by_id=current_user.id,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)
    return report


@router.get("/", response_model=List[ReportResponse])
async def list_reports(
    report_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(Report)
    if report_type:
        query = query.where(Report.report_type == report_type)
    query = query.order_by(Report.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.delete("/{report_id}", status_code=204)
async def delete_report(report_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
