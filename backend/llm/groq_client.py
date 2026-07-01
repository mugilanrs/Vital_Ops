"""Groq LLM client for IRR resolution synthesis."""

import json

from groq import AsyncGroq

from backend.config import settings

IRR_SYSTEM_PROMPT = """You are an expert IT incident resolution advisor for an insurance company.
Given an incident and resolutions from similar past incidents, synthesize a comprehensive recommended resolution.

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Brief summary of the recommended resolution approach",
  "business_impact": "Assessment of the business impact and urgency",
  "resolution_steps": ["Step 1...", "Step 2...", "Step 3..."],
  "kb_articles": ["Relevant KB topic 1", "Relevant KB topic 2"],
  "confidence": <float between 0.55 and 0.95, reflecting how well the similar resolutions match this incident — use lower values (0.55-0.65) when resolutions are vague or few, medium values (0.66-0.79) when partially relevant, high values (0.80-0.95) when multiple closely matching resolutions exist>,
  "estimated_resolution_hrs": <float>
}

Do NOT use a fixed confidence value. Vary it based on the evidence quality provided."""


async def synthesize_resolution(ticket, similar_resolutions: list[dict]) -> dict:
    if not settings.groq_api_key:
        return _fallback_response(similar_resolutions)

    similar_text = ""
    for i, s in enumerate(similar_resolutions, 1):
        similar_text += f"\n--- Similar Ticket {i} (Score: {s.get('score', 0)}) ---\n"
        similar_text += f"Subject: {s.get('subject', '')}\n"
        similar_text += f"Resolution: {s.get('resolution_notes', '')}\n"

    user_prompt = f"""Current Incident:
Subject: {ticket.subject}
Description: {ticket.description}
Service: {ticket.service_instance}
Priority: {ticket.priority}

Similar Past Resolutions:{similar_text}

Synthesize a recommended resolution based on the patterns from similar incidents."""

    client = AsyncGroq(api_key=settings.groq_api_key)
    response = await client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": IRR_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        max_tokens=1024,
    )

    text = response.choices[0].message.content.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        return _fallback_response(similar_resolutions)


def _fallback_response(similar_resolutions: list[dict]) -> dict:
    steps = []
    for s in similar_resolutions[:3]:
        notes = s.get("resolution_notes", "")
        if notes:
            steps.append(f"From {s.get('ticket_id', 'similar ticket')}: {notes[:200]}")

    return {
        "summary": "Resolution synthesized from similar historical incidents.",
        "business_impact": "Review similar incidents for impact assessment.",
        "resolution_steps": steps or ["Review similar ticket resolutions manually."],
        "kb_articles": [],
        "confidence": 0.3,
        "estimated_resolution_hrs": 4.0,
    }
