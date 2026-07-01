"""
Auto-Triage Agent (deterministic, no LLM).
1. Embed the ticket -> search Qdrant for top-5 similar resolved tickets
2. Tally historical team ownership from similar tickets
3. Rank engineers by availability / load / seniority
4. Return recommended team + engineer with confidence score
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Engineer, Team, Ticket, TriageResult


async def run_triage_agent(ticket: Ticket, db: AsyncSession) -> TriageResult:
    try:
        from backend.rag.search import search_similar
        similar = await search_similar(ticket, top_k=5, resolved_only=True)
    except Exception:
        similar = []

    team_scores: dict[str, float] = {}
    similar_ids = []

    for hit in similar:
        t_team = hit.get("assigned_team", "")
        score = hit.get("score", 0.5)
        if t_team:
            team_scores[t_team] = team_scores.get(t_team, 0) + score
        similar_ids.append(hit.get("ticket_id", ""))

    if not team_scores:
        team_scores[ticket.assigned_team or "L1 Service Desk"] = 0.5

    best_team = max(team_scores, key=team_scores.get)

    team_row = (await db.execute(select(Team).where(Team.name == best_team))).scalar_one_or_none()
    recommended_engineer = None
    if team_row:
        engineers = (await db.execute(
            select(Engineer)
            .where(Engineer.team_id == team_row.id, Engineer.status == "Available")
            .order_by(Engineer.current_load.asc())
        )).scalars().all()

        seniority_bonus = {"Lead": 4, "Senior": 3, "Mid": 2, "Junior": 1}
        if engineers:
            ranked = sorted(engineers, key=lambda e: (
                -(seniority_bonus.get(e.seniority, 0)),
                e.current_load,
            ))
            recommended_engineer = ranked[0].name

    total_score = sum(team_scores.values())
    raw = team_scores[best_team] / max(total_score, 0.01)
    confidence = round(min(raw * (0.6 + 0.25 * min(len(similar), 5) / 5), 0.85), 2)

    avg_hrs_list = [h.get("avg_resolution_hrs") for h in similar if h.get("avg_resolution_hrs")]
    sla_estimate = round(sum(avg_hrs_list) / len(avg_hrs_list), 1) if avg_hrs_list else 4.0

    existing = (await db.execute(
        select(TriageResult).where(TriageResult.ticket_id == ticket.id)
    )).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()

    result = TriageResult(
        ticket_id=ticket.id,
        recommended_team=best_team,
        recommended_engineer=recommended_engineer,
        confidence=confidence,
        reasoning={
            "team_scores": team_scores,
            "similar_ticket_count": len(similar),
            "method": "vector_similarity_team_tally",
        },
        similar_ticket_ids=similar_ids,
        sla_estimate_hrs=sla_estimate,
    )

    db.add(result)
    ticket.status = "In Progress"
    ticket.assigned_team = best_team
    ticket.assigned_to = recommended_engineer
    await db.commit()
    await db.refresh(result)

    return result
