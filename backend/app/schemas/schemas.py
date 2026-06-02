from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "analyst"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class DocumentUploadResponse(BaseModel):
    id: str
    name: str
    original_filename: str
    file_size: int
    format: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentDetailResponse(BaseModel):
    id: str
    name: str
    original_filename: str
    file_size: int
    format: str
    status: str
    page_count: Optional[int]
    word_count: Optional[int]
    language: Optional[str]
    ocr_applied: bool
    domain: Optional[str]
    tags: List[str]
    document_metadata: Dict[str, Any]
    processing_error: Optional[str]
    created_at: datetime
    processing_completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    items: List[DocumentUploadResponse]
    total: int
    page: int
    page_size: int


class SectionResponse(BaseModel):
    id: str
    title: Optional[str]
    content: str
    section_type: str
    level: int
    page_number: Optional[int]
    sequence_index: int
    word_count: int

    model_config = {"from_attributes": True}


class KnowledgeUnitResponse(BaseModel):
    id: str
    document_id: str
    section_id: Optional[str]
    unit_type: str
    content: str
    title: Optional[str]
    confidence_score: float
    tags: List[str]
    unit_metadata: Dict[str, Any]
    is_validated: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=2000)
    document_ids: Optional[List[str]] = None
    unit_types: Optional[List[str]] = None
    top_k: int = Field(default=10, ge=1, le=50)
    min_score: float = Field(default=0.0, ge=0.0, le=1.0)
    include_metadata: bool = True


class KnowledgeSearchResult(BaseModel):
    unit: KnowledgeUnitResponse
    relevance_score: float
    document_name: str
    section_title: Optional[str]


class KnowledgeSearchResponse(BaseModel):
    query: str
    intent: str
    results: List[KnowledgeSearchResult]
    total_results: int
    search_time_ms: int


class ReasoningRequest(BaseModel):
    query: str = Field(..., min_length=5, max_length=5000)
    document_ids: Optional[List[str]] = None
    reasoning_depth: str = Field(default="full", pattern="^(quick|standard|full)$")
    output_format: str = Field(default="detailed", pattern="^(brief|detailed|structured)$")
    include_evidence: bool = True
    max_reasoning_steps: int = Field(default=5, ge=1, le=10)


class EvidenceItem(BaseModel):
    document_id: str
    document_name: str
    section_title: Optional[str]
    content: str
    page_number: Optional[int]
    relevance_score: float


class ConfidenceBreakdown(BaseModel):
    retrieval_similarity: float
    metadata_quality: float
    evidence_density: float
    rule_alignment: float
    context_completeness: float
    overall: float


class ReasoningStepResponse(BaseModel):
    step_number: int
    layer: str
    action: str
    result: str
    evidence_used: List[str]
    confidence: float


class ReasoningResponse(BaseModel):
    query_id: str
    query: str
    intent: str
    answer: str
    reasoning_trace: List[ReasoningStepResponse]
    evidence: List[EvidenceItem]
    confidence: ConfidenceBreakdown
    model_used: str
    latency_ms: int
    tokens_used: int


class AgentBlueprintCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    description: str
    source_document_ids: List[str]
    auto_extract: bool = True


class AgentRoleResponse(BaseModel):
    name: str
    description: str
    responsibilities: List[str]
    required_knowledge: List[str]
    tools: List[str]
    decision_authority: str


class AgentWorkflowStep(BaseModel):
    step_id: str
    name: str
    description: str
    agent_role: str
    inputs: List[str]
    outputs: List[str]
    decision_points: List[Dict[str, Any]]
    escalation_triggers: List[str]


class AgentBlueprintResponse(BaseModel):
    id: str
    name: str
    description: str
    source_document_ids: List[str]
    roles: List[AgentRoleResponse]
    responsibilities: List[str]
    workflows: List[AgentWorkflowStep]
    decision_rules: List[Dict[str, Any]]
    escalation_paths: List[Dict[str, Any]]
    required_knowledge_sources: List[str]
    system_prompt: Optional[str]
    status: str
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportCreateRequest(BaseModel):
    title: str
    report_type: str
    document_ids: List[str]
    query_id: Optional[str] = None
    include_evidence: bool = True
    include_confidence: bool = True
    format: str = Field(default="json", pattern="^(json|pdf|markdown)$")


class ReportResponse(BaseModel):
    id: str
    title: str
    report_type: str
    document_ids: List[str]
    summary: Optional[str]
    content: Dict[str, Any]
    format: str
    created_at: datetime

    model_config = {"from_attributes": True}


class EntityResponse(BaseModel):
    id: str
    entity_type: str
    value: str
    normalized_value: Optional[str]
    confidence: float
    context: Optional[str]
    page_number: Optional[int]

    model_config = {"from_attributes": True}


class FeedbackRequest(BaseModel):
    query_id: str
    feedback: str = Field(..., pattern="^(positive|negative|neutral)$")
    note: Optional[str] = None


class PlatformStatsResponse(BaseModel):
    total_documents: int
    processed_documents: int
    total_knowledge_units: int
    total_queries: int
    total_agents: int
    total_reports: int
    avg_confidence_score: float
    documents_by_format: Dict[str, int]
    queries_by_intent: Dict[str, int]
    recent_activity: List[Dict[str, Any]]
