import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Integer, Float, Boolean, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.database import Base


class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"
    ARCHIVED = "archived"


class DocumentFormat(str, enum.Enum):
    PDF = "pdf"
    DOCX = "docx"
    PPTX = "pptx"
    CSV = "csv"
    XLSX = "xlsx"
    TXT = "txt"
    IMAGE = "image"
    UNKNOWN = "unknown"


class KnowledgeUnitType(str, enum.Enum):
    REQUIREMENT = "requirement"
    CONSTRAINT = "constraint"
    POLICY = "policy"
    DEFINITION = "definition"
    RISK = "risk"
    RECOMMENDATION = "recommendation"
    PROCEDURE = "procedure"
    RESPONSIBILITY = "responsibility"
    THRESHOLD = "threshold"
    DEPENDENCY = "dependency"
    FACT = "fact"


class ReasoningIntent(str, enum.Enum):
    INFORMATIONAL = "informational"
    ANALYTICAL = "analytical"
    ADVISORY = "advisory"


class AgentStatus(str, enum.Enum):
    DRAFT = "draft"
    VALIDATED = "validated"
    DEPLOYED = "deployed"
    DEPRECATED = "deprecated"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="analyst")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    documents: Mapped[List["Document"]] = relationship("Document", back_populates="uploaded_by")
    queries: Mapped[List["ReasoningQuery"]] = relationship("ReasoningQuery", back_populates="user")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    format: Mapped[str] = mapped_column(String(20), default=DocumentFormat.UNKNOWN)
    status: Mapped[str] = mapped_column(String(20), default=DocumentStatus.PENDING)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    word_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    ocr_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    domain: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tags: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    document_metadata: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    processing_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processing_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    processing_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    uploaded_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    uploaded_by: Mapped[Optional["User"]] = relationship("User", back_populates="documents")
    sections: Mapped[List["DocumentSection"]] = relationship("DocumentSection", back_populates="document", cascade="all, delete-orphan")
    knowledge_units: Mapped[List["KnowledgeUnit"]] = relationship("KnowledgeUnit", back_populates="document", cascade="all, delete-orphan")
    extracted_entities: Mapped[List["ExtractedEntity"]] = relationship("ExtractedEntity", back_populates="document", cascade="all, delete-orphan")


class DocumentSection(Base):
    __tablename__ = "document_sections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id"), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    section_type: Mapped[str] = mapped_column(String(50), default="body")
    level: Mapped[int] = mapped_column(Integer, default=1)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sequence_index: Mapped[int] = mapped_column(Integer, default=0)
    embedding_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    word_count: Mapped[int] = mapped_column(Integer, default=0)

    document: Mapped["Document"] = relationship("Document", back_populates="sections")
    knowledge_units: Mapped[List["KnowledgeUnit"]] = relationship("KnowledgeUnit", back_populates="section")


class KnowledgeUnit(Base):
    __tablename__ = "knowledge_units"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id"), nullable=False)
    section_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("document_sections.id"), nullable=True)
    unit_type: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    tags: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    unit_metadata: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    embedding_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_validated: Mapped[bool] = mapped_column(Boolean, default=False)
    validated_by_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    document: Mapped["Document"] = relationship("Document", back_populates="knowledge_units")
    section: Mapped[Optional["DocumentSection"]] = relationship("DocumentSection", back_populates="knowledge_units")


class ExtractedEntity(Base):
    __tablename__ = "extracted_entities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id"), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[str] = mapped_column(String(500), nullable=False)
    normalized_value: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    source_offset: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    document: Mapped["Document"] = relationship("Document", back_populates="extracted_entities")


class ReasoningQuery(Base):
    __tablename__ = "reasoning_queries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    intent: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    document_scope: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    retrieved_chunks: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    reasoning_trace: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    final_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_breakdown: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    feedback_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="queries")


class AgentBlueprint(Base):
    __tablename__ = "agent_blueprints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    source_document_ids: Mapped[List] = mapped_column(JSON, default=list)
    roles: Mapped[List] = mapped_column(JSON, default=list)
    responsibilities: Mapped[List] = mapped_column(JSON, default=list)
    workflows: Mapped[List] = mapped_column(JSON, default=list)
    decision_rules: Mapped[List] = mapped_column(JSON, default=list)
    escalation_paths: Mapped[List] = mapped_column(JSON, default=list)
    required_knowledge_sources: Mapped[List] = mapped_column(JSON, default=list)
    system_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tools_config: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default=AgentStatus.DRAFT)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)
    document_ids: Mapped[List] = mapped_column(JSON, default=list)
    query_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    format: Mapped[str] = mapped_column(String(20), default="json")
    file_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
