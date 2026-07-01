"""
DQ (Data Quality) Agent — purely rule-based, 10 static rules.
"""

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import DqResult, Ticket


def _check_min_length(notes: str, **_) -> tuple[bool, str]:
    passed = len(notes) >= 100
    return passed, f"Resolution notes length: {len(notes)} chars (min 100)"


def _check_root_cause(notes: str, **_) -> tuple[bool, str]:
    keywords = ["root cause", "caused by", "due to", "because"]
    found = any(k in notes.lower() for k in keywords)
    return found, "Root cause identification present" if found else "No root cause language found"


def _check_resolution_steps(notes: str, **_) -> tuple[bool, str]:
    keywords = ["resolved by", "fix applied", "steps taken", "step 1", "1.", "2.", "3."]
    found = any(k in notes.lower() for k in keywords)
    return found, "Resolution steps present" if found else "No resolution steps found"


def _check_no_placeholder(notes: str, **_) -> tuple[bool, str]:
    placeholders = ["todo", "tbd", "placeholder", "xxx", "lorem ipsum", "n/a"]
    found = any(p in notes.lower() for p in placeholders)
    return not found, "No placeholder text" if not found else "Placeholder text detected"


def _check_language(notes: str, **_) -> tuple[bool, str]:
    bad_words = ["rtfm", "pebkac", "user error", "stupid", "idiot"]
    found = any(w in notes.lower() for w in bad_words)
    return not found, "Customer-friendly language" if not found else "Inappropriate language detected"


def _check_service_referenced(notes: str, service_instance: str = "", **_) -> tuple[bool, str]:
    if not service_instance:
        return True, "No service instance to check"
    svc_lower = service_instance.lower()
    svc_parts = re.split(r"[/ ]", svc_lower)
    found = any(part in notes.lower() for part in svc_parts if len(part) > 2)
    return found, f"Service '{service_instance}' referenced" if found else f"Service '{service_instance}' not mentioned"


def _check_timeline(notes: str, **_) -> tuple[bool, str]:
    time_patterns = [
        r"\d{4}-\d{2}-\d{2}", r"\d{1,2}:\d{2}",
        r"\d{1,2}/\d{1,2}/\d{2,4}", r"\d{1,2}\s+(am|pm)",
    ]
    time_words = ["minutes", "hours", "started at", "completed at", "timeline", "after"]
    regex_found = any(re.search(p, notes) for p in time_patterns)
    word_found = any(w in notes.lower() for w in time_words)
    found = regex_found or word_found
    return found, "Timeline/timestamp present" if found else "No timeline information found"


def _check_no_copy_paste(notes: str, **_) -> tuple[bool, str]:
    lines = notes.strip().split("\n")
    if len(lines) > 3:
        unique = set(l.strip() for l in lines if l.strip())
        if len(unique) < len(lines) * 0.5:
            return False, "Repeated lines detected (possible copy-paste)"
    if re.search(r"<[a-zA-Z][^>]*>", notes):
        return False, "HTML tags detected (possible copy-paste)"
    if notes.count("at ") > 10 and "Exception" in notes:
        return False, "Stack trace detected (possible copy-paste)"
    return True, "No copy-paste artifacts"


def _check_impact(notes: str, **_) -> tuple[bool, str]:
    keywords = ["impact", "affected", "downtime", "users impacted", "business impact", "revenue"]
    found = any(k in notes.lower() for k in keywords)
    return found, "Impact acknowledged" if found else "No impact acknowledgment found"


def _check_preventive(notes: str, **_) -> tuple[bool, str]:
    keywords = ["prevent", "going forward", "recommendation", "monitoring", "future", "ensure"]
    found = any(k in notes.lower() for k in keywords)
    return found, "Preventive measures mentioned" if found else "No preventive measures found"


DQ_RULES = [
    {"id": 1, "name": "Minimum Length", "fn": _check_min_length},
    {"id": 2, "name": "Root Cause Identified", "fn": _check_root_cause},
    {"id": 3, "name": "Resolution Steps Present", "fn": _check_resolution_steps},
    {"id": 4, "name": "No Placeholder Text", "fn": _check_no_placeholder},
    {"id": 5, "name": "Customer-Friendly Language", "fn": _check_language},
    {"id": 6, "name": "Service Instance Referenced", "fn": _check_service_referenced},
    {"id": 7, "name": "Timestamp/Timeline Present", "fn": _check_timeline},
    {"id": 8, "name": "No Copy-Paste Artifacts", "fn": _check_no_copy_paste},
    {"id": 9, "name": "Impact Acknowledged", "fn": _check_impact},
    {"id": 10, "name": "Preventive Measures", "fn": _check_preventive},
]


async def run_dq_agent(ticket: Ticket, db: AsyncSession) -> DqResult:
    notes = ticket.resolution_notes or ""
    svc = ticket.service_instance or ""

    rules_output = []
    passed_count = 0

    for rule in DQ_RULES:
        passed, detail = rule["fn"](notes, service_instance=svc)
        if passed:
            passed_count += 1
        rules_output.append({
            "rule_id": rule["id"],
            "name": rule["name"],
            "passed": passed,
            "detail": detail,
        })

    score = round((passed_count / len(DQ_RULES)) * 100, 1)
    overall_pass = score >= 70

    existing = (await db.execute(
        select(DqResult).where(DqResult.ticket_id == ticket.id)
    )).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()

    result = DqResult(
        ticket_id=ticket.id,
        score=score,
        passed=overall_pass,
        rules=rules_output,
    )

    db.add(result)
    await db.commit()
    await db.refresh(result)

    return result
