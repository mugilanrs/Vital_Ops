from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class IncidentCreate(BaseModel):
    service_instance: str
    subject: str
    description: str
    priority: str = "Medium"
    impact: str = "Medium"
    reporter_name: str = ""
    organisation: str = ""
    department: str = ""
    location: str = ""
    source: str = "Xurrent Portal"
    environment: str = "Production"
    category: str = "Application Error"
    incident_type: str = "incident"


class IncidentOut(BaseModel):
    id: UUID
    ticket_id: str
    service_instance: str
    assigned_team: str | None = None
    assigned_to: str | None = None
    reporter_name: str | None = None
    organisation: str | None = None
    department: str | None = None
    location: str | None = None
    source: str | None = None
    environment: str | None = None
    priority: str
    status: str
    subject: str
    description: str
    resolution_notes: str | None = None
    category: str | None = None
    incident_type: str | None = None
    impact: str | None = None
    keywords: str | None = None
    completion_reason: str | None = None
    created_at: datetime
    first_response_at: datetime | None = None
    resolved_at: datetime | None = None
    sla_breached: bool = False
    avg_resolution_hrs: float | None = None
    data_quality_tier: str | None = None
    is_live: bool = False

    model_config = {"from_attributes": True}


class IncidentListOut(BaseModel):
    items: list[IncidentOut]
    total: int
    page: int
    page_size: int


class TriageOut(BaseModel):
    id: UUID
    ticket_id: UUID
    recommended_team: str
    recommended_engineer: str | None = None
    confidence: float
    reasoning: dict
    similar_ticket_ids: list
    sla_estimate_hrs: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class IntelligenceOut(BaseModel):
    id: UUID
    ticket_id: UUID
    similar_tickets: list
    correlated_open_tickets: list
    created_at: datetime

    model_config = {"from_attributes": True}


class IrrOut(BaseModel):
    id: UUID
    ticket_id: UUID
    similar_resolutions: list
    llm_recommendation: dict
    confidence: float
    created_at: datetime

    model_config = {"from_attributes": True}


class ResolveRequest(BaseModel):
    resolution_notes: str


class DqOut(BaseModel):
    id: UUID
    ticket_id: UUID
    score: float
    passed: bool
    rules: list
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamOut(BaseModel):
    id: UUID
    team_id: str
    name: str
    service_instances: list

    model_config = {"from_attributes": True}


class EngineerOut(BaseModel):
    id: UUID
    name: str
    email: str
    seniority: str
    specializations: list
    status: str
    current_load: int

    model_config = {"from_attributes": True}


class AnalyticsSummary(BaseModel):
    total_incidents: int
    open_incidents: int
    resolved_today: int
    avg_resolution_hrs: float
    sla_compliance_pct: float
    mttr_hrs: float
    incidents_by_priority: dict
    incidents_by_service: dict


class TrendPoint(BaseModel):
    date: str
    count: int
    resolved: int
