"""Singleton SentenceTransformer embedding model."""

from functools import lru_cache

from backend.config import settings


@lru_cache(maxsize=1)
def get_model():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(settings.embedding_model)


def embed_text(text: str) -> list[float]:
    model = get_model()
    return model.encode(text, normalize_embeddings=True).tolist()


def embed_ticket_text(subject: str, description: str, resolution_notes: str = "") -> list[float]:
    combined = f"{subject} {description} {resolution_notes}".strip()
    return embed_text(combined)
