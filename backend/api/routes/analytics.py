from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.schemas import AnalyticsSummary, TrendPoint
from backend.db.database import get_db
from backend.db.models import Ticket

router = APIRouter(tags=["Analytics"])


@router.get("/analytics/summary", response_model=AnalyticsSummary)
async def get_summary(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count(Ticket.id)))).scalar() or 0

    open_count = (await db.execute(
        select(func.count(Ticket.id)).where(Ticket.status.in_(["New", "In Progress"]))
    )).scalar() or 0

    week_ago = datetime.utcnow() - timedelta(days=7)
    resolved_today = (await db.execute(
        select(func.count(Ticket.id)).where(
            and_(Ticket.status == "Resolved", Ticket.resolved_at >= week_ago)
        )
    )).scalar() or 0

    avg_hrs = (await db.execute(
        select(func.avg(Ticket.avg_resolution_hrs)).where(Ticket.avg_resolution_hrs.isnot(None))
    )).scalar() or 0.0

    sla_total = (await db.execute(
        select(func.count(Ticket.id)).where(Ticket.status.in_(["Resolved", "Closed"]))
    )).scalar() or 1
    sla_ok = (await db.execute(
        select(func.count(Ticket.id)).where(
            and_(Ticket.status.in_(["Resolved", "Closed"]), Ticket.sla_breached == False)
        )
    )).scalar() or 0
    sla_pct = round((sla_ok / sla_total) * 100, 1) if sla_total else 0

    by_priority = {}
    rows = (await db.execute(
        select(Ticket.priority, func.count(Ticket.id)).group_by(Ticket.priority)
    )).all()
    for row in rows:
        by_priority[row[0]] = row[1]

    by_service = {}
    rows = (await db.execute(
        select(Ticket.service_instance, func.count(Ticket.id)).group_by(Ticket.service_instance)
    )).all()
    for row in rows:
        by_service[row[0]] = row[1]

    return AnalyticsSummary(
        total_incidents=total,
        open_incidents=open_count,
        resolved_today=resolved_today,
        avg_resolution_hrs=round(float(avg_hrs), 2),
        sla_compliance_pct=sla_pct,
        mttr_hrs=round(float(avg_hrs), 2),
        incidents_by_priority=by_priority,
        incidents_by_service=by_service,
    )


@router.get("/analytics/trends", response_model=list[TrendPoint])
async def get_trends(days: int = 30, db: AsyncSession = Depends(get_db)):
    end = datetime.utcnow()
    start = end - timedelta(days=days)

    rows = (await db.execute(
        select(
            func.date(Ticket.created_at).label("d"),
            func.count(Ticket.id).label("total"),
            func.sum(case((Ticket.status.in_(["Resolved", "Closed"]), 1), else_=0)).label("resolved"),
        )
        .where(Ticket.created_at >= start)
        .group_by(func.date(Ticket.created_at))
        .order_by(func.date(Ticket.created_at))
    )).all()

    return [TrendPoint(date=str(r[0]), count=r[1], resolved=r[2]) for r in rows]
