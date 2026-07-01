export interface Incident {
  id: string;
  ticket_id: string;
  service_instance: string;
  assigned_team: string | null;
  assigned_to: string | null;
  reporter_name: string | null;
  organisation: string | null;
  department: string | null;
  location: string | null;
  source: string | null;
  environment: string | null;
  priority: string;
  status: string;
  subject: string;
  description: string;
  resolution_notes: string | null;
  category: string | null;
  incident_type: string | null;
  impact: string | null;
  keywords: string | null;
  completion_reason: string | null;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  sla_breached: boolean;
  avg_resolution_hrs: number | null;
  data_quality_tier: string | null;
  is_live: boolean;
}

export interface IncidentListResponse {
  items: Incident[];
  total: number;
  page: number;
  page_size: number;
}

export interface TriageResult {
  id: string;
  ticket_id: string;
  recommended_team: string;
  recommended_engineer: string | null;
  confidence: number;
  reasoning: Record<string, unknown>;
  similar_ticket_ids: string[];
  sla_estimate_hrs: number | null;
  created_at: string;
}

export interface IntelligenceResult {
  id: string;
  ticket_id: string;
  similar_tickets: SimilarTicket[];
  correlated_open_tickets: SimilarTicket[];
  created_at: string;
}

export interface SimilarTicket {
  ticket_id: string;
  subject: string;
  description: string;
  resolution_notes: string;
  service_instance: string;
  assigned_team: string;
  priority: string;
  status: string;
  category: string;
  avg_resolution_hrs: number | null;
  score: number;
}

export interface IrrResult {
  id: string;
  ticket_id: string;
  similar_resolutions: SimilarTicket[];
  llm_recommendation: LlmRecommendation;
  confidence: number;
  created_at: string;
}

export interface LlmRecommendation {
  summary?: string;
  business_impact?: string;
  resolution_steps?: string[];
  kb_articles?: string[];
  confidence?: number;
  estimated_resolution_time?: string;
  raw?: string;
}

export interface DqResult {
  id: string;
  ticket_id: string;
  score: number;
  passed: boolean;
  rules: DqRule[];
  created_at: string;
}

export interface DqRule {
  rule_id: number;
  name: string;
  passed: boolean;
  detail: string;
}

export interface Team {
  id: string;
  team_id: string;
  name: string;
  service_instances: string[];
}

export interface Engineer {
  id: string;
  name: string;
  email: string;
  seniority: string;
  specializations: string[];
  status: string;
  current_load: number;
}

export interface AnalyticsSummary {
  total_incidents: number;
  open_incidents: number;
  resolved_today: number;
  avg_resolution_hrs: number;
  sla_compliance_pct: number;
  mttr_hrs: number;
  incidents_by_priority: Record<string, number>;
  incidents_by_service: Record<string, number>;
}

export interface TrendPoint {
  date: string;
  count: number;
  resolved: number;
}

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

export type PipelineStage =
  | 'idle'
  | 'pipeline_started'
  | 'triage_started'
  | 'triage_completed'
  | 'intelligence_started'
  | 'intelligence_completed'
  | 'irr_started'
  | 'irr_completed'
  | 'human_review_pending'
  | 'dq_started'
  | 'dq_completed'
  | 'pipeline_complete';
