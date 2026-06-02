import uuid
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from datetime import datetime

from app.database import get_db
from app.models import Document, DocumentSection, KnowledgeUnit, ExtractedEntity, DocumentStatus
from app.schemas.schemas import DocumentUploadResponse, DocumentDetailResponse, DocumentListResponse, SectionResponse, EntityResponse
from app.core.security import get_current_user
from app.config import get_settings
from app.services.ingestion.pipeline import run_ingestion_pipeline

settings = get_settings()
router = APIRouter()


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    domain: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if file.size and file.size > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large. Max size: {settings.max_upload_size_mb}MB")

    ext = Path(file.filename).suffix.lower().lstrip(".")
    supported = {"pdf", "docx", "pptx", "csv", "xlsx", "txt", "png", "jpg", "jpeg", "tiff"}
    if ext not in supported:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {ext}")

    doc_id = str(uuid.uuid4())
    dest_path = settings.uploads_dir / f"{doc_id}_{file.filename}"
    
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    tag_list = [t.strip() for t in tags.split(",")] if tags else []
    
    doc = Document(
        id=doc_id,
        name=Path(file.filename).stem,
        original_filename=file.filename,
        file_path=str(dest_path),
        file_size=dest_path.stat().st_size,
        format=ext if ext in supported else "unknown",
        status=DocumentStatus.PENDING,
        domain=domain,
        tags=tag_list,
        uploaded_by_id=current_user.id,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)

    background_tasks.add_task(run_ingestion_pipeline, doc_id=doc_id, file_path=str(dest_path))
    
    return doc


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(Document)
    if status_filter:
        query = query.where(Document.status == status_filter)
    if domain:
        query = query.where(Document.domain == domain)
    if search:
        query = query.where(Document.name.ilike(f"%{search}%"))

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    documents = result.scalars().all()

    return DocumentListResponse(items=documents, total=total, page=page, page_size=page_size)


@router.get("/{doc_id}", response_model=DocumentDetailResponse)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = Path(doc.file_path)
    if file_path.exists():
        file_path.unlink()

    from app.core.vector_store import VectorStoreService
    try:
        VectorStoreService.get().remove_by_document_id(doc_id)
    except Exception:
        pass

    await db.execute(delete(ExtractedEntity).where(ExtractedEntity.document_id == doc_id))
    await db.execute(delete(KnowledgeUnit).where(KnowledgeUnit.document_id == doc_id))
    await db.execute(delete(DocumentSection).where(DocumentSection.document_id == doc_id))
    await db.delete(doc)


@router.get("/{doc_id}/sections", response_model=List[SectionResponse])
async def get_sections(doc_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(
        select(DocumentSection).where(DocumentSection.document_id == doc_id).order_by(DocumentSection.sequence_index)
    )
    return result.scalars().all()


@router.get("/{doc_id}/entities", response_model=List[EntityResponse])
async def get_entities(
    doc_id: str,
    entity_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(ExtractedEntity).where(ExtractedEntity.document_id == doc_id)
    if entity_type:
        query = query.where(ExtractedEntity.entity_type == entity_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/{doc_id}/reprocess", status_code=202)
async def reprocess_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.status = DocumentStatus.PENDING
    doc.processing_error = None
    background_tasks.add_task(run_ingestion_pipeline, doc_id=doc_id, file_path=doc.file_path)
    
    return {"message": "Reprocessing started", "document_id": doc_id}
