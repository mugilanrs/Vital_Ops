from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.schemas import IntelligenceOut
from backend.db.database import get_db
from backend.db.models import Ticket
from backend.sse.manager import sse_manager

router = APIRouter(tags=["Intelligence"])


@router.post("/incidents/{ticket_id}/intelligence", response_model=IntelligenceOut)
async def run_intelligence(ticket_id: str, db: AsyncSession = Depends(get_db)):
    ticket = (await db.execute(select(Ticket).where(Ticket.ticket_id == ticket_id))).scalar_one()

    await sse_manager.broadcast("intelligence_started", {"ticket_id": ticket_id})

    from backend.agents.intelligence_agent import run_intelligence_agent
    result = await run_intelligence_agent(ticket, db)

    await sse_manager.broadcast("intelligence_completed", {
        "ticket_id": ticket_id,
        "similar_count": len(result.similar_tickets),
        "correlated_count": len(result.correlated_open_tickets),
    })

    return result
