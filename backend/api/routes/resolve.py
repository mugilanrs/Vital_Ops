from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.schemas import IncidentOut, ResolveRequest
from backend.db.database import get_db
from backend.db.models import Ticket
from backend.sse.manager import sse_manager

router = APIRouter(tags=["Resolve"])


@router.put("/incidents/{ticket_id}/resolve", response_model=IncidentOut)
async def submit_resolution(ticket_id: str, body: ResolveRequest, db: AsyncSession = Depends(get_db)):
    ticket = (await db.execute(select(Ticket).where(Ticket.ticket_id == ticket_id))).scalar_one()

    ticket.resolution_notes = body.resolution_notes
    ticket.status = "Resolved"
    await db.commit()
    await db.refresh(ticket)

    await sse_manager.broadcast("human_review_completed", {
        "ticket_id": ticket_id,
        "status": "Resolved",
    })

    return ticket
