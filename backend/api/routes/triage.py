from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.schemas import TriageOut
from backend.db.database import get_db
from backend.db.models import Ticket, TriageResult
from backend.sse.manager import sse_manager

router = APIRouter(tags=["Triage"])


@router.post("/incidents/{ticket_id}/triage", response_model=TriageOut)
async def run_triage(ticket_id: str, db: AsyncSession = Depends(get_db)):
    ticket = (await db.execute(select(Ticket).where(Ticket.ticket_id == ticket_id))).scalar_one()

    await sse_manager.broadcast("triage_started", {"ticket_id": ticket_id})

    from backend.agents.triage_agent import run_triage_agent
    result = await run_triage_agent(ticket, db)

    await sse_manager.broadcast("triage_completed", {
        "ticket_id": ticket_id,
        "recommended_team": result.recommended_team,
        "confidence": result.confidence,
    })

    return result
