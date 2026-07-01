"""
Incident Intelligence Agent.
1. Embed ticket -> search Qdrant for top-5 similar historical (Resolved/Closed) tickets
2. Search for correlated open tickets (same service_instance, status=New/In Progress)
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import IntelligenceResult, Ticket


async def run_intelligence_agent(ticket: Ticket, db: AsyncSession) -> IntelligenceResult:
    try:
        from backend.rag.search import search_similar
        similar = await search_similar(ticket, top_k=5, resolved_only=True)
    except Exception:
        similar = []

    correlated_q = (
        select(Ticket)
        .where(
            Ticket.service_instance == ticket.service_instance,
            Ticket.status.in_(["New", "In Progress"]),
            Ticket.id != ticket.id,
        )
        .order_by(Ticket.created_at.desc())
        .limit(5)
    )
    correlated_rows = (await db.execute(correlated_q)).scalars().all()
    correlated = [
        {
            "ticket_id": t.ticket_id,
            "subject": t.subject,
            "status": t.status,
            "priority": t.priority,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "service_instance": t.service_instance,
        }
        for t in correlated_rows
    ]

    existing = (await db.execute(
        select(IntelligenceResult).where(IntelligenceResult.ticket_id == ticket.id)
    )).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()

    result = IntelligenceResult(
        ticket_id=ticket.id,
        similar_tickets=similar,
        correlated_open_tickets=correlated,
    )

    db.add(result)
    await db.commit()
    await db.refresh(result)

    return result
