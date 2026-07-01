import asyncio

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from backend.sse.manager import sse_manager

router = APIRouter(tags=["SSE"])


@router.get("/events")
async def event_stream():
    queue = sse_manager.subscribe()

    async def generate():
        try:
            while True:
                data = await queue.get()
                yield {"data": data}
        except asyncio.CancelledError:
            sse_manager.unsubscribe(queue)

    return EventSourceResponse(generate())
