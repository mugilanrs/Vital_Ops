"""
IRR (Incident Resolution Recommendation) Agent.
1. Get similar ticket resolutions from Intelligence result (or re-search)
2. Send incident + similar resolutions to Groq LLM for synthesis
3. Return BOTH raw similar resolutions AND LLM-generated recommendation
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import IntelligenceResult, IrrResult, Ticket


async def run_irr_agent(ticket: Ticket, db: AsyncSession) -> IrrResult:
    intel = (await db.execute(
        select(IntelligenceResult).where(IntelligenceResult.ticket_id == ticket.id)
    )).scalar_one_or_none()

    if intel and intel.similar_tickets:
        similar = intel.similar_tickets
    else:
        try:
            from backend.rag.search import search_similar
            similar = await search_similar(ticket, top_k=5, resolved_only=True)
        except Exception:
            similar = []

    similar_resolutions = []
    for s in similar[:5]:
        similar_resolutions.append({
            "ticket_id": s.get("ticket_id", ""),
            "subject": s.get("subject", ""),
            "resolution_notes": s.get("resolution_notes", ""),
            "score": s.get("score", 0),
            "service_instance": s.get("service_instance", ""),
            "assigned_team": s.get("assigned_team", ""),
        })

    try:
        from backend.llm.groq_client import synthesize_resolution
        llm_result = await synthesize_resolution(ticket, similar_resolutions)
    except Exception:
        llm_result = {
            "summary": "Unable to generate LLM recommendation at this time.",
            "business_impact": "Unknown",
            "resolution_steps": ["Review similar ticket resolutions manually"],
            "kb_articles": [],
            "confidence": 0.0,
            "estimated_resolution_hrs": 4.0,
        }

    confidence = llm_result.get("confidence", 0.5)

    existing = (await db.execute(
        select(IrrResult).where(IrrResult.ticket_id == ticket.id)
    )).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()

    result = IrrResult(
        ticket_id=ticket.id,
        similar_resolutions=similar_resolutions,
        llm_recommendation=llm_result,
        confidence=confidence,
    )

    db.add(result)
    await db.commit()
    await db.refresh(result)

    return result
