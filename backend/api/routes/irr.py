from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.schemas import IrrOut
from backend.db.database import get_db
from backend.db.models import Ticket
from backend.sse.manager import sse_manager

router = APIRouter(tags=["IRR"])


@router.post("/incidents/{ticket_id}/irr", response_model=IrrOut)
async def run_irr(ticket_id: str, db: AsyncSession = Depends(get_db)):
    ticket = (await db.execute(select(Ticket).where(Ticket.ticket_id == ticket_id))).scalar_one()

    await sse_manager.broadcast("irr_started", {"ticket_id": ticket_id})

    from backend.agents.irr_agent import run_irr_agent
    result = await run_irr_agent(ticket, db)

    await sse_manager.broadcast("irr_completed", {
        "ticket_id": ticket_id,
        "confidence": result.confidence,
    })

    return result
