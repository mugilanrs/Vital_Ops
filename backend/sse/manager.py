import asyncio
import json
from datetime import datetime


class SSEManager:
    def __init__(self):
        self._queues: list[asyncio.Queue] = []

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._queues.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._queues.remove(q)

    async def broadcast(self, event_type: str, data: dict):
        payload = {
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            **data,
        }
        msg = json.dumps(payload, default=str)
        for q in self._queues:
            await q.put(msg)


sse_manager = SSEManager()
