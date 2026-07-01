from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.schemas import DqOut
from backend.db.database import get_db
from backend.db.models import Ticket
from backend.sse.manager import sse_manager

router = APIRouter(tags=["DQ"])


@router.post("/incidents/{ticket_id}/dq", response_model=DqOut)
async def run_dq(ticket_id: str, db: AsyncSession = Depends(get_db)):
    ticket = (await db.execute(select(Ticket).where(Ticket.ticket_id == ticket_id))).scalar_one()

    await sse_manager.broadcast("dq_started", {"ticket_id": ticket_id})

    from backend.agents.dq_agent import run_dq_agent
    result = await run_dq_agent(ticket, db)

    await sse_manager.broadcast("dq_completed", {
        "ticket_id": ticket_id,
        "score": result.score,
        "passed": result.passed,
    })

    return result
