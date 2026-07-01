"""Qdrant similarity search for ITSM tickets."""

from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchAny

from backend.config import settings
from backend.rag.embeddings import embed_ticket_text

COLLECTION = "itsm_incidents"

_client: QdrantClient | None = None


def _get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=settings.qdrant_url)
    return _client


async def search_similar(ticket, top_k: int = 5, resolved_only: bool = True) -> list[dict]:
    vector = embed_ticket_text(ticket.subject, ticket.description, ticket.resolution_notes or "")

    query_filter = None
    if resolved_only:
        query_filter = Filter(
            must=[
                FieldCondition(key="status", match=MatchAny(any=["Resolved", "Closed"]))
            ]
        )

    client = _get_client()
    results = client.query_points(
        collection_name=COLLECTION,
        query=vector,
        query_filter=query_filter,
        limit=top_k,
        with_payload=True,
    )

    hits = []
    for point in results.points:
        payload = point.payload or {}
        hits.append({
            "ticket_id": payload.get("ticket_id", ""),
            "subject": payload.get("subject", ""),
            "description": payload.get("description", ""),
            "resolution_notes": payload.get("resolution_notes", ""),
            "service_instance": payload.get("service_instance", ""),
            "assigned_team": payload.get("assigned_team", ""),
            "priority": payload.get("priority", ""),
            "status": payload.get("status", ""),
            "category": payload.get("category", ""),
            "avg_resolution_hrs": payload.get("avg_resolution_hrs"),
            "score": round(point.score, 4) if point.score else 0,
        })

    return hits
