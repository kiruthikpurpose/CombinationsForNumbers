export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Document {
  id: string;
  name: string;
  original_filename: string;
  file_size: number;
  format: string;
  status: 'pending' | 'processing' | 'processed' | 'failed' | 'archived';
  page_count?: number;
  word_count?: number;
  language?: string;
  ocr_applied: boolean;
  domain?: string;
  tags: string[];
  document_metadata: Record<string, unknown>;
  processing_error?: string;
  created_at: string;
  processing_completed_at?: string;
}

export interface DocumentSection {
  id: string;
  title?: string;
  content: string;
  section_type: string;
  level: number;
  page_number?: number;
  sequence_index: number;
  word_count: number;
}

export interface KnowledgeUnit {
  id: string;
  document_id: string;
  section_id?: string;
  unit_type: KnowledgeUnitType;
  content: string;
  title?: string;
  confidence_score: number;
  tags: string[];
  unit_metadata: Record<string, unknown>;
  is_validated: boolean;
  created_at: string;
}

export type KnowledgeUnitType =
  | 'requirement'
  | 'constraint'
  | 'policy'
  | 'definition'
  | 'risk'
  | 'recommendation'
  | 'procedure'
  | 'responsibility'
  | 'threshold'
  | 'dependency'
  | 'fact';

export interface KnowledgeSearchResult {
  unit: KnowledgeUnit;
  relevance_score: number;
  document_name: string;
  section_title?: string;
}

export interface KnowledgeSearchResponse {
  query: string;
  intent: string;
  results: KnowledgeSearchResult[];
  total_results: number;
  search_time_ms: number;
}

export interface EvidenceItem {
  document_id: string;
  document_name: string;
  section_title?: string;
  content: string;
  page_number?: number;
  relevance_score: number;
}

export interface ConfidenceBreakdown {
  retrieval_similarity: number;
  metadata_quality: number;
  evidence_density: number;
  rule_alignment: number;
  context_completeness: number;
  overall: number;
}

export interface ReasoningStep {
  step_number: number;
  layer: string;
  action: string;
  result: string;
  evidence_used: string[];
  confidence: number;
}

export interface ReasoningResponse {
  query_id: string;
  query: string;
  intent: string;
  answer: string;
  reasoning_trace: ReasoningStep[];
  evidence: EvidenceItem[];
  confidence: ConfidenceBreakdown;
  model_used: string;
  latency_ms: number;
  tokens_used: number;
}

export interface AgentRole {
  name: string;
  description: string;
  responsibilities: string[];
  required_knowledge: string[];
  tools: string[];
  decision_authority: string;
}

export interface AgentWorkflowStep {
  step_id: string;
  name: string;
  description: string;
  agent_role: string;
  inputs: string[];
  outputs: string[];
  decision_points: Array<{ condition: string; action: string }>;
  escalation_triggers: string[];
}

export interface AgentBlueprint {
  id: string;
  name: string;
  description: string;
  source_document_ids: string[];
  roles: AgentRole[];
  responsibilities: string[];
  workflows: AgentWorkflowStep[];
  decision_rules: Array<{ rule_id: string; condition: string; action: string; priority: string }>;
  escalation_paths: Array<{ trigger: string; escalate_to: string; notification: string }>;
  required_knowledge_sources: string[];
  system_prompt?: string;
  status: 'draft' | 'validated' | 'deployed' | 'deprecated';
  version: number;
  created_at: string;
}

export interface Report {
  id: string;
  title: string;
  report_type: string;
  document_ids: string[];
  summary?: string;
  content: Record<string, unknown>;
  format: string;
  created_at: string;
}

export interface PlatformStats {
  total_documents: number;
  processed_documents: number;
  total_knowledge_units: number;
  total_queries: number;
  total_agents: number;
  total_reports: number;
  avg_confidence_score: number;
  documents_by_format: Record<string, number>;
  queries_by_intent: Record<string, number>;
  recent_activity: Array<{ action: string; resource_type: string; created_at: string }>;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  intent: string;
  confidence: number;
  model_used: string;
  latency_ms: number;
  created_at: string;
  feedback?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadProgress {
  file: File;
  progress: number;
  status: UploadStatus;
  documentId?: string;
  error?: string;
}
