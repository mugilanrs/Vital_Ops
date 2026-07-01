"""
Seed PostgreSQL with 50K tickets and team roster data.
Run: python -m backend.db.seed
"""

import asyncio
import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import text

from backend.db.database import Base, async_session, engine
from backend.db.models import Engineer, Team, Ticket

SCRIPTS_DATA = Path(__file__).parent.parent.parent / "scripts" / "data"
BATCH_SIZE = 1000


def parse_dt(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    return datetime.fromisoformat(val)


async def seed_teams():
    roster = json.loads((SCRIPTS_DATA / "team_roster.json").read_text(encoding="utf-8"))

    async with async_session() as session:
        existing = (await session.execute(text("SELECT COUNT(*) FROM teams"))).scalar()
        if existing > 0:
            print(f"Teams table already has {existing} rows, skipping.")
            return

        for team_name, team_data in roster["teams"].items():
            team = Team(
                team_id=team_data["team_id"],
                name=team_name,
                service_instances=team_data["service_instances"],
            )
            session.add(team)
            await session.flush()

            for member in team_data["members"]:
                eng = Engineer(
                    name=member["name"],
                    email=member["email"],
                    seniority=member["seniority"],
                    specializations=member["specializations"],
                    status=member["status"],
                    current_load=member["current_load"],
                    team_id=team.id,
                )
                session.add(eng)

        await session.commit()
        print(f"Seeded {len(roster['teams'])} teams with engineers.")


async def seed_tickets():
    tickets_path = SCRIPTS_DATA / "tickets_50k.jsonl"
    if not tickets_path.exists():
        print(f"Tickets file not found: {tickets_path}")
        return

    async with async_session() as session:
        existing = (await session.execute(text("SELECT COUNT(*) FROM tickets"))).scalar()
        if existing > 0:
            print(f"Tickets table already has {existing} rows, skipping.")
            return

        batch = []
        count = 0

        with open(tickets_path, encoding="utf-8") as f:
            for line in f:
                data = json.loads(line)
                ticket = Ticket(
                    ticket_id=data["ticket_id"],
                    scenario_id=data.get("scenario_id"),
                    service_instance=data["service_instance"],
                    assigned_team=data.get("assigned_team"),
                    assigned_to=data.get("assigned_to"),
                    reporter_name=data.get("reporter_name"),
                    organisation=data.get("organisation"),
                    department=data.get("department"),
                    location=data.get("location"),
                    source=data.get("source"),
                    environment=data.get("environment"),
                    priority=data["priority"],
                    status=data["status"],
                    subject=data["subject"],
                    description=data["description"],
                    resolution_notes=data.get("resolution_notes", ""),
                    category=data.get("category"),
                    incident_type=data.get("incident_type"),
                    impact=data.get("impact"),
                    keywords=data.get("keywords"),
                    completion_reason=data.get("completion_reason"),
                    created_at=parse_dt(data.get("created_at")),
                    first_response_at=parse_dt(data.get("first_response_at")),
                    resolved_at=parse_dt(data.get("resolved_at")),
                    sla_breached=data.get("sla_breached", False),
                    avg_resolution_hrs=data.get("avg_resolution_hrs"),
                    data_quality_tier=data.get("data_quality_tier"),
                    is_live=False,
                )
                batch.append(ticket)
                count += 1

                if len(batch) >= BATCH_SIZE:
                    session.add_all(batch)
                    await session.commit()
                    batch = []
                    if count % 10000 == 0:
                        print(f"  Seeded {count:,} tickets...")

        if batch:
            session.add_all(batch)
            await session.commit()

        print(f"Seeded {count:,} tickets total.")


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created.")

    await seed_teams()
    await seed_tickets()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
