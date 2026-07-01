import asyncio

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import Ticket
from backend.sse.manager import sse_manager

router = APIRouter(tags=["Pipeline"])


@router.post("/incidents/{ticket_id}/run-pipeline")
async def run_pipeline(ticket_id: str, db: AsyncSession = Depends(get_db)):
    ticket = (await db.execute(select(Ticket).where(Ticket.ticket_id == ticket_id))).scalar_one()

    await sse_manager.broadcast("pipeline_started", {"ticket_id": ticket_id})
    await asyncio.sleep(0.5)

    from backend.agents.triage_agent import run_triage_agent
    await sse_manager.broadcast("triage_started", {"ticket_id": ticket_id})
    await asyncio.sleep(0.3)
    triage = await run_triage_agent(ticket, db)
    await sse_manager.broadcast("triage_completed", {
        "ticket_id": ticket_id,
        "recommended_team": triage.recommended_team,
        "confidence": triage.confidence,
    })
    await asyncio.sleep(0.5)

    from backend.agents.intelligence_agent import run_intelligence_agent
    await sse_manager.broadcast("intelligence_started", {"ticket_id": ticket_id})
    await asyncio.sleep(0.3)
    intel = await run_intelligence_agent(ticket, db)
    await sse_manager.broadcast("intelligence_completed", {
        "ticket_id": ticket_id,
        "similar_count": len(intel.similar_tickets),
        "correlated_count": len(intel.correlated_open_tickets),
    })
    await asyncio.sleep(0.5)

    from backend.agents.irr_agent import run_irr_agent
    await sse_manager.broadcast("irr_started", {"ticket_id": ticket_id})
    await asyncio.sleep(0.3)
    irr = await run_irr_agent(ticket, db)
    await sse_manager.broadcast("irr_completed", {
        "ticket_id": ticket_id,
        "confidence": irr.confidence,
    })
    await asyncio.sleep(0.5)

    await sse_manager.broadcast("human_review_pending", {"ticket_id": ticket_id})

    return {
        "ticket_id": ticket_id,
        "status": "pipeline_complete_awaiting_human_review",
        "triage": {"recommended_team": triage.recommended_team, "confidence": triage.confidence},
        "intelligence": {"similar_count": len(intel.similar_tickets), "correlated_count": len(intel.correlated_open_tickets)},
        "irr": {"confidence": irr.confidence},
    }
