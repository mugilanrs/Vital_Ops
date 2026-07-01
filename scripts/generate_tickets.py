"""
generate_tickets.py
Generates 50,000 ITSM incident tickets as JSONL for Vital-Ops.
Uses scenario_catalog.json, variable_pool.json, and team_roster.json.

Run: python scripts/generate_tickets.py
Output: scripts/data/tickets_50k.jsonl
"""

import json
import random
import hashlib
from datetime import datetime, timedelta
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
rng = random.Random(42)

TOTAL_TICKETS = 50_000

STATUS_DIST = {
    "Resolved": 0.60,
    "Closed": 0.20,
    "In Progress": 0.10,
    "New": 0.05,
    "Cancelled": 0.05,
}

QUALITY_TIERS = {
    "golden": 0.15,
    "acceptable": 0.50,
    "poor": 0.25,
    "bad": 0.10,
}

PRIORITY_MAP = {
    "Top": {"sla_hours": 4, "weight": 0.05},
    "High": {"sla_hours": 8, "weight": 0.30},
    "Medium": {"sla_hours": 24, "weight": 0.40},
    "Low": {"sla_hours": 72, "weight": 0.25},
}


def load_json(name: str):
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def weighted_choice(options: dict) -> str:
    keys = list(options.keys())
    weights = [options[k] for k in keys]
    return rng.choices(keys, weights)[0]


def pick_quality_tier() -> str:
    return weighted_choice(QUALITY_TIERS)


def pick_status() -> str:
    return weighted_choice(STATUS_DIST)


def pick_priority() -> str:
    return weighted_choice({p: v["weight"] for p, v in PRIORITY_MAP.items()})


def random_date(start: datetime, end: datetime) -> datetime:
    delta = end - start
    offset = rng.random() * delta.total_seconds()
    return start + timedelta(seconds=offset)


def fill_template(template: str, variables: dict) -> str:
    result = template
    for key, value in variables.items():
        result = result.replace(f"{{{key}}}", str(value))
    return result


def degrade_resolution(text: str, tier: str) -> str:
    if tier == "golden":
        return text
    if tier == "acceptable":
        parts = text.split(". ")
        return ". ".join(parts[:max(3, len(parts) - 2)]) + "."
    if tier == "poor":
        parts = text.split(". ")
        short = ". ".join(parts[:2])
        return short if len(short) > 30 else "Fixed the issue."
    return rng.choice([
        "Fixed.",
        "Done.",
        "Resolved as per user request.",
        "Applied fix.",
        "Issue addressed.",
        "TBD - pending documentation.",
        "Restarted service.",
    ])


def find_team_for_scenario(scenario: dict, roster: dict) -> tuple[str, dict] | tuple[None, None]:
    typical = scenario.get("typical_team")
    if typical and typical in roster["teams"]:
        team_data = roster["teams"][typical]
        return typical, team_data
    svc = scenario["service_instance"]
    for team_name, team_data in roster["teams"].items():
        if svc in team_data["service_instances"]:
            return team_name, team_data
    team_name = rng.choice(list(roster["teams"].keys()))
    return team_name, roster["teams"][team_name]


def pick_engineer(team_data: dict) -> dict:
    available = [m for m in team_data["members"] if m["status"] == "Available"]
    if not available:
        available = team_data["members"]
    return rng.choice(available)


def generate_ticket_id(index: int) -> str:
    return f"INC-{index:06d}"


def main():
    pool = load_json("variable_pool.json")
    scenarios = load_json("scenario_catalog.json")
    roster = load_json("team_roster.json")

    svc_key_map = {
        "Salesforce": "salesforce",
        "WSO2 API Gateway": "wso2",
        "Guidewire ClaimCenter": "guidewire_claim",
        "Guidewire PolicyCenter": "guidewire_policy",
        "Duck Creek": "duck_creek",
        "SAP ECC/S4HANA": "sap",
        "Microsoft 365": "microsoft365",
        "ServiceNow": "servicenow",
        "Oracle EBS": "oracle_ebs",
        "Informatica/ETL": "informatica",
        "Active Directory/IAM": "active_directory",
        "Network/Infrastructure": "network",
        "HEAL": "heal",
    }

    start_date = datetime(2024, 1, 1)
    end_date = datetime(2025, 6, 30)

    reporters = [f"{rng.choice(pool['departments'])} User {i}" for i in range(1, 201)]

    out_path = DATA_DIR / "tickets_50k.jsonl"
    count = 0

    with open(out_path, "w", encoding="utf-8") as f:
        for i in range(1, TOTAL_TICKETS + 1):
            scenario = rng.choice(scenarios)
            svc = scenario["service_instance"]
            svc_key = svc_key_map.get(svc, "generic")

            dept = rng.choice(pool["departments"])
            location = rng.choice(pool["locations"])
            org = rng.choice(pool["organisations"])
            source = rng.choice(pool["sources"])
            env = rng.choice(pool["environments"])
            error = rng.choice(pool["error_codes"].get(svc_key, pool["error_codes"]["generic"]))
            event = rng.choice(pool["events"])
            browser = rng.choice(pool["browsers"])
            user_count = rng.choice([5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200])

            root_cause_cat = rng.choice(list(pool["root_causes"].keys()))
            root_cause = rng.choice(pool["root_causes"][root_cause_cat])
            fix_cat = rng.choice(list(pool["fix_actions"].keys()))
            steps = rng.sample(pool["fix_actions"][fix_cat], min(3, len(pool["fix_actions"][fix_cat])))
            verify = rng.choice(pool["verification_phrases"])

            template_vars = {
                "dept": dept,
                "location": location,
                "error": error,
                "count": str(user_count),
                "event": event,
                "env": env,
                "browser": browser,
                "root_cause": root_cause,
                "step1": steps[0] if len(steps) > 0 else "Investigated the issue",
                "step2": steps[1] if len(steps) > 1 else "Applied corrective action",
                "step3": steps[2] if len(steps) > 2 else "Verified resolution",
                "verify": verify,
                "confirm": rng.choice(["User confirmed working", "User validated fix", "Stakeholder approved"]),
            }

            subject = fill_template(scenario["subject_template"], template_vars)
            description = fill_template(scenario["description_template"], template_vars)
            resolution_raw = fill_template(scenario["resolution_template"], template_vars)

            status = pick_status()
            quality_tier = pick_quality_tier()
            priority = scenario.get("priority", pick_priority())
            impact = scenario.get("impact", priority)

            if status in ("New", "In Progress"):
                resolution_notes = ""
                quality_tier = "bad"
            elif status == "Cancelled":
                resolution_notes = rng.choice(["Duplicate ticket.", "No longer applicable.", "Cancelled by requestor."])
                quality_tier = "bad"
            else:
                resolution_notes = degrade_resolution(resolution_raw, quality_tier)

            created = random_date(start_date, end_date)
            base_hrs = scenario.get("avg_resolution_hrs", 4.0)
            jitter = rng.uniform(0.5, 2.5)
            resolution_hrs = base_hrs * jitter

            if status in ("Resolved", "Closed"):
                resolved_at = created + timedelta(hours=resolution_hrs)
                first_response = created + timedelta(minutes=rng.randint(5, 120))
            elif status == "In Progress":
                resolved_at = None
                first_response = created + timedelta(minutes=rng.randint(5, 60))
            else:
                resolved_at = None
                first_response = None

            sla_hrs = PRIORITY_MAP.get(priority, {}).get("sla_hours", 24)
            sla_breached = resolution_hrs > sla_hrs if resolved_at else False

            team_name, team_data = find_team_for_scenario(scenario, roster)
            engineer = pick_engineer(team_data)

            ticket = {
                "ticket_id": generate_ticket_id(i),
                "scenario_id": scenario["scenario_id"],
                "service_instance": svc,
                "assigned_team": team_name,
                "assigned_to": engineer["name"],
                "reporter_name": rng.choice(reporters),
                "organisation": org,
                "department": dept,
                "location": location,
                "source": source,
                "environment": env,
                "priority": priority,
                "status": status,
                "subject": subject,
                "description": description,
                "resolution_notes": resolution_notes,
                "category": scenario["category"],
                "incident_type": scenario["incident_type"],
                "impact": impact,
                "keywords": scenario["keywords"],
                "completion_reason": scenario["completion_reason"] if status in ("Resolved", "Closed") else "",
                "created_at": created.isoformat(),
                "first_response_at": first_response.isoformat() if first_response else None,
                "resolved_at": resolved_at.isoformat() if resolved_at else None,
                "sla_breached": sla_breached,
                "avg_resolution_hrs": round(resolution_hrs, 2) if resolved_at else None,
                "data_quality_tier": quality_tier,
            }

            f.write(json.dumps(ticket, ensure_ascii=False) + "\n")
            count += 1

            if count % 10000 == 0:
                print(f"  Generated {count:,} tickets...")

    print(f"\nDone! Generated {count:,} tickets -> {out_path}")

    from collections import Counter
    tiers = Counter()
    statuses = Counter()
    services = Counter()
    with open(out_path, encoding="utf-8") as f:
        for line in f:
            t = json.loads(line)
            tiers[t["data_quality_tier"]] += 1
            statuses[t["status"]] += 1
            services[t["service_instance"]] += 1

    print("\nQuality Tier Distribution:")
    for tier, cnt in sorted(tiers.items()):
        print(f"  {tier}: {cnt:,} ({cnt/count*100:.1f}%)")

    print("\nStatus Distribution:")
    for s, cnt in sorted(statuses.items()):
        print(f"  {s}: {cnt:,} ({cnt/count*100:.1f}%)")

    print("\nService Instance Distribution:")
    for svc, cnt in sorted(services.items()):
        print(f"  {svc}: {cnt:,} ({cnt/count*100:.1f}%)")


if __name__ == "__main__":
    main()
