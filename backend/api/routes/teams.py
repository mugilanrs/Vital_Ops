from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api.schemas import EngineerOut, TeamOut
from backend.db.database import get_db
from backend.db.models import Engineer, Team

router = APIRouter(tags=["Teams"])


@router.get("/teams", response_model=list[TeamOut])
async def list_teams(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).order_by(Team.name))
    return result.scalars().all()


@router.get("/teams/{team_id}/engineers", response_model=list[EngineerOut])
async def list_engineers(team_id: str, db: AsyncSession = Depends(get_db)):
    q = (
        select(Engineer)
        .join(Team)
        .where(Team.team_id == team_id)
        .order_by(Engineer.name)
    )
    result = await db.execute(q)
    return result.scalars().all()
