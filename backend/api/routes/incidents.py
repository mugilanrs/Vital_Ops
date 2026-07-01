import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.schemas import IncidentCreate, IncidentListOut, IncidentOut
from backend.db.database import get_db
from backend.db.models import Ticket
from backend.sse.manager import sse_manager

router = APIRouter(tags=["Incidents"])


def _next_ticket_id() -> str:
    return f"LIVE-{uuid.uuid4().hex[:8].upper()}"


@router.post("/incidents", response_model=IncidentOut, status_code=201)
async def create_incident(body: IncidentCreate, db: AsyncSession = Depends(get_db)):
    ticket = Ticket(
        ticket_id=_next_ticket_id(),
        service_instance=body.service_instance,
        subject=body.subject,
        description=body.description,
        priority=body.priority,
        impact=body.impact,
        reporter_name=body.reporter_name,
        organisation=body.organisation,
        department=body.department,
        location=body.location,
        source=body.source,
        environment=body.environment,
        category=body.category,
        incident_type=body.incident_type,
        status="New",
        is_live=True,
        created_at=datetime.utcnow(),
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    await sse_manager.broadcast("incident_received", {
        "ticket_id": ticket.ticket_id,
        "subject": ticket.subject,
        "service_instance": ticket.service_instance,
        "priority": ticket.priority,
    })

    return ticket


@router.get("/incidents", response_model=IncidentListOut)
async def list_incidents(
    status: str | None = None,
    service_instance: str | None = None,
    priority: str | None = None,
    is_live: bool | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    q = select(Ticket)
    count_q = select(func.count(Ticket.id))

    if status:
        q = q.where(Ticket.status == status)
        count_q = count_q.where(Ticket.status == status)
    if service_instance:
        q = q.where(Ticket.service_instance == service_instance)
        count_q = count_q.where(Ticket.service_instance == service_instance)
    if priority:
        q = q.where(Ticket.priority == priority)
        count_q = count_q.where(Ticket.priority == priority)
    if is_live is not None:
        q = q.where(Ticket.is_live == is_live)
        count_q = count_q.where(Ticket.is_live == is_live)
    if search:
        pattern = f"%{search}%"
        q = q.where(Ticket.subject.ilike(pattern) | Ticket.ticket_id.ilike(pattern))
        count_q = count_q.where(Ticket.subject.ilike(pattern) | Ticket.ticket_id.ilike(pattern))

    total = (await db.execute(count_q)).scalar() or 0
    q = q.order_by(Ticket.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    items = result.scalars().all()

    return IncidentListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/incidents/{ticket_id}", response_model=IncidentOut)
async def get_incident(ticket_id: str, db: AsyncSession = Depends(get_db)):
    q = select(Ticket).where(Ticket.ticket_id == ticket_id)
    result = await db.execute(q)
    ticket = result.scalar_one()
    return ticket
