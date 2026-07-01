import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.database import Base


def new_uuid():
    return uuid.uuid4()


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    ticket_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    scenario_id: Mapped[str | None] = mapped_column(String(20))
    service_instance: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    assigned_team: Mapped[str | None] = mapped_column(String(100))
    assigned_to: Mapped[str | None] = mapped_column(String(200))
    reporter_name: Mapped[str | None] = mapped_column(String(200))
    organisation: Mapped[str | None] = mapped_column(String(200))
    department: Mapped[str | None] = mapped_column(String(100))
    location: Mapped[str | None] = mapped_column(String(100))
    source: Mapped[str | None] = mapped_column(String(50))
    environment: Mapped[str | None] = mapped_column(String(50))
    priority: Mapped[str] = mapped_column(String(20), index=True, nullable=False, default="Medium")
    status: Mapped[str] = mapped_column(String(20), index=True, nullable=False, default="New")
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    resolution_notes: Mapped[str | None] = mapped_column(Text, default="")
    category: Mapped[str | None] = mapped_column(String(100))
    incident_type: Mapped[str | None] = mapped_column(String(50))
    impact: Mapped[str | None] = mapped_column(String(20))
    keywords: Mapped[str | None] = mapped_column(Text)
    completion_reason: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    first_response_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sla_breached: Mapped[bool] = mapped_column(Boolean, default=False)
    avg_resolution_hrs: Mapped[float | None] = mapped_column(Float)
    data_quality_tier: Mapped[str | None] = mapped_column(String(20))
    is_live: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    triage_result: Mapped["TriageResult | None"] = relationship(back_populates="ticket", uselist=False, cascade="all, delete-orphan")
    intelligence_result: Mapped["IntelligenceResult | None"] = relationship(back_populates="ticket", uselist=False, cascade="all, delete-orphan")
    irr_result: Mapped["IrrResult | None"] = relationship(back_populates="ticket", uselist=False, cascade="all, delete-orphan")
    dq_result: Mapped["DqResult | None"] = relationship(back_populates="ticket", uselist=False, cascade="all, delete-orphan")


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    team_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    service_instances: Mapped[list] = mapped_column(JSONB, default=list)

    engineers: Mapped[list["Engineer"]] = relationship(back_populates="team", cascade="all, delete-orphan")


class Engineer(Base):
    __tablename__ = "engineers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False)
    seniority: Mapped[str] = mapped_column(String(20), nullable=False)
    specializations: Mapped[list] = mapped_column(JSONB, default=list)
    status: Mapped[str] = mapped_column(String(20), default="Available")
    current_load: Mapped[int] = mapped_column(Integer, default=0)
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)

    team: Mapped["Team"] = relationship(back_populates="engineers")


class TriageResult(Base):
    __tablename__ = "triage_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tickets.id"), unique=True, nullable=False)
    recommended_team: Mapped[str] = mapped_column(String(100))
    recommended_engineer: Mapped[str | None] = mapped_column(String(200))
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    reasoning: Mapped[dict] = mapped_column(JSONB, default=dict)
    similar_ticket_ids: Mapped[list] = mapped_column(JSONB, default=list)
    sla_estimate_hrs: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket: Mapped["Ticket"] = relationship(back_populates="triage_result")


class IntelligenceResult(Base):
    __tablename__ = "intelligence_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tickets.id"), unique=True, nullable=False)
    similar_tickets: Mapped[list] = mapped_column(JSONB, default=list)
    correlated_open_tickets: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket: Mapped["Ticket"] = relationship(back_populates="intelligence_result")


class IrrResult(Base):
    __tablename__ = "irr_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tickets.id"), unique=True, nullable=False)
    similar_resolutions: Mapped[list] = mapped_column(JSONB, default=list)
    llm_recommendation: Mapped[dict] = mapped_column(JSONB, default=dict)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket: Mapped["Ticket"] = relationship(back_populates="irr_result")


class DqResult(Base):
    __tablename__ = "dq_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tickets.id"), unique=True, nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    rules: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket: Mapped["Ticket"] = relationship(back_populates="dq_result")
