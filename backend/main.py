from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.db.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Pre-warm the embedding model and Qdrant client so the first request isn't slow
    import asyncio
    import logging
    logger = logging.getLogger("vital-ops")
    loop = asyncio.get_event_loop()
    try:
        from backend.rag.embeddings import get_model
        from backend.rag.search import _get_client
        logger.info("Warming up embedding model…")
        await loop.run_in_executor(None, get_model)
        logger.info("Embedding model ready.")
        _get_client()
        logger.info("Qdrant client ready.")
    except Exception as e:
        logger.warning(f"Warm-up skipped: {e}")
    yield
    await engine.dispose()


app = FastAPI(
    title="Vital-Ops Backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.api.routes import analytics, dq, incidents, intelligence, irr, pipeline, resolve, sse, teams, triage

app.include_router(incidents.router)
app.include_router(teams.router)
app.include_router(sse.router)
app.include_router(triage.router)
app.include_router(intelligence.router)
app.include_router(irr.router)
app.include_router(resolve.router)
app.include_router(dq.router)
app.include_router(pipeline.router)
app.include_router(analytics.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "vital-ops-backend"}
