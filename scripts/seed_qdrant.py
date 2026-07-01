"""
seed_qdrant.py
Embeds 50K tickets and upserts into Qdrant vector DB.
Run: python scripts/seed_qdrant.py
"""

import json
import uuid
from pathlib import Path

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from sentence_transformers import SentenceTransformer

DATA_DIR = Path(__file__).parent / "data"
COLLECTION = "itsm_incidents"
VECTOR_DIM = 384
BATCH_SIZE = 256

QDRANT_URL = "http://localhost:6333"
MODEL_NAME = "all-MiniLM-L6-v2"


def main():
    print(f"Loading embedding model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)

    print(f"Connecting to Qdrant at {QDRANT_URL}")
    client = QdrantClient(url=QDRANT_URL)

    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION in collections:
        info = client.get_collection(COLLECTION)
        if info.points_count and info.points_count > 40000:
            print(f"Collection '{COLLECTION}' already has {info.points_count} points, skipping.")
            return
        client.delete_collection(COLLECTION)

    client.create_collection(
        collection_name=COLLECTION,
        vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
    )
    print(f"Created collection '{COLLECTION}' (dim={VECTOR_DIM}, cosine).")

    client.create_payload_index(COLLECTION, "status", "keyword")
    client.create_payload_index(COLLECTION, "service_instance", "keyword")
    client.create_payload_index(COLLECTION, "priority", "keyword")

    tickets_path = DATA_DIR / "tickets_50k.jsonl"
    tickets = []
    with open(tickets_path, encoding="utf-8") as f:
        for line in f:
            tickets.append(json.loads(line))
    print(f"Loaded {len(tickets):,} tickets.")

    texts = []
    for t in tickets:
        combined = f"{t['subject']} {t['description']} {t.get('resolution_notes', '')}".strip()
        texts.append(combined)

    print("Encoding embeddings (this may take a few minutes)...")
    all_embeddings = model.encode(texts, batch_size=BATCH_SIZE, show_progress_bar=True, normalize_embeddings=True)

    print("Upserting to Qdrant...")
    points_batch = []
    for i, (ticket, embedding) in enumerate(zip(tickets, all_embeddings)):
        point = PointStruct(
            id=str(uuid.uuid5(uuid.NAMESPACE_DNS, ticket["ticket_id"])),
            vector=embedding.tolist(),
            payload={
                "ticket_id": ticket["ticket_id"],
                "subject": ticket["subject"],
                "description": ticket["description"][:500],
                "resolution_notes": ticket.get("resolution_notes", "")[:500],
                "service_instance": ticket["service_instance"],
                "assigned_team": ticket.get("assigned_team", ""),
                "priority": ticket["priority"],
                "status": ticket["status"],
                "category": ticket.get("category", ""),
                "impact": ticket.get("impact", ""),
                "avg_resolution_hrs": ticket.get("avg_resolution_hrs"),
            },
        )
        points_batch.append(point)

        if len(points_batch) >= BATCH_SIZE:
            client.upsert(collection_name=COLLECTION, points=points_batch)
            points_batch = []
            if (i + 1) % 5000 == 0:
                print(f"  Upserted {i + 1:,} points...")

    if points_batch:
        client.upsert(collection_name=COLLECTION, points=points_batch)

    info = client.get_collection(COLLECTION)
    print(f"\nDone! Collection '{COLLECTION}' has {info.points_count} points.")


if __name__ == "__main__":
    main()
