import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import AgentBlueprint, Document, DocumentSection, AgentStatus
from app.schemas.schemas import AgentBlueprintCreate, AgentBlueprintResponse
from app.core.security import get_current_user
from app.core.llm_client import get_llm_client

router = APIRouter()


async def _generate_blueprint_task(blueprint_id: str, document_ids: List[str]):
    from app.database import AsyncSessionLocal
    from app.core.llm_client import get_llm_client

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(AgentBlueprint).where(AgentBlueprint.id == blueprint_id))
            blueprint = result.scalar_one_or_none()
            if not blueprint:
                return

            doc_contents = []
            doc_names = []
            for doc_id in document_ids:
                sections_result = await db.execute(
                    select(DocumentSection).where(DocumentSection.document_id == doc_id).order_by(DocumentSection.sequence_index).limit(5)
                )
                sections = sections_result.scalars().all()
                content = "\n\n".join(s.content for s in sections)
                doc_result = await db.execute(select(Document).where(Document.id == doc_id))
                doc = doc_result.scalar_one_or_none()
                if doc and content:
                    doc_contents.append(content)
                    doc_names.append(doc.name)

            if not doc_contents:
                blueprint.status = AgentStatus.DRAFT
                await db.commit()
                return

            llm = get_llm_client()
            extracted = await llm.generate_agent_blueprint(doc_contents, doc_names)

            blueprint.roles = extracted.get("roles", [])
            blueprint.workflows = extracted.get("workflows", [])
            blueprint.decision_rules = extracted.get("decision_rules", [])
            blueprint.escalation_paths = extracted.get("escalation_paths", [])
            blueprint.required_knowledge_sources = extracted.get("required_knowledge_sources", [])
            blueprint.system_prompt = extracted.get("system_prompt", "")
            blueprint.status = AgentStatus.VALIDATED
            await db.commit()
        except Exception as e:
            from loguru import logger
            logger.error(f"Blueprint generation failed: {e}")


@router.post("/", response_model=AgentBlueprintResponse, status_code=201)
async def create_agent_blueprint(
    blueprint_in: AgentBlueprintCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    for doc_id in blueprint_in.source_document_ids:
        result = await db.execute(select(Document).where(Document.id == doc_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")

    blueprint = AgentBlueprint(
        id=str(uuid.uuid4()),
        name=blueprint_in.name,
        description=blueprint_in.description,
        source_document_ids=blueprint_in.source_document_ids,
        status=AgentStatus.DRAFT,
        created_by_id=current_user.id,
    )
    db.add(blueprint)
    await db.flush()
    await db.refresh(blueprint)

    if blueprint_in.auto_extract:
        background_tasks.add_task(_generate_blueprint_task, blueprint.id, blueprint_in.source_document_ids)

    return blueprint


@router.get("/", response_model=List[AgentBlueprintResponse])
async def list_blueprints(
    status_filter: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(AgentBlueprint)
    if status_filter:
        query = query.where(AgentBlueprint.status == status_filter)
    query = query.order_by(AgentBlueprint.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{blueprint_id}", response_model=AgentBlueprintResponse)
async def get_blueprint(blueprint_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(AgentBlueprint).where(AgentBlueprint.id == blueprint_id))
    blueprint = result.scalar_one_or_none()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Agent blueprint not found")
    return blueprint


@router.post("/{blueprint_id}/deploy", response_model=AgentBlueprintResponse)
async def deploy_blueprint(blueprint_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(AgentBlueprint).where(AgentBlueprint.id == blueprint_id))
    blueprint = result.scalar_one_or_none()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Agent blueprint not found")
    if blueprint.status != AgentStatus.VALIDATED:
        raise HTTPException(status_code=400, detail="Only validated blueprints can be deployed")
    blueprint.status = AgentStatus.DEPLOYED
    return blueprint


@router.delete("/{blueprint_id}", status_code=204)
async def delete_blueprint(blueprint_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(AgentBlueprint).where(AgentBlueprint.id == blueprint_id))
    blueprint = result.scalar_one_or_none()
    if not blueprint:
        raise HTTPException(status_code=404, detail="Agent blueprint not found")
    await db.delete(blueprint)
