import asyncio, json
from typing import Dict, List
from fastapi import Request
from fastapi.responses import StreamingResponse

class SSEManager:
    def __init__(self):
        self.connections: Dict[str, List[asyncio.Queue]] = {}

    def subscribe(self, channel: str) -> asyncio.Queue:
        q = asyncio.Queue()
        self.connections.setdefault(channel, []).append(q)
        return q

    def unsubscribe(self, channel: str, q: asyncio.Queue):
        if channel in self.connections:
            self.connections[channel].remove(q)

    async def broadcast(self, channel: str, data: dict):
        for q in self.connections.get(channel, []):
            await q.put(data)

    async def stream(self, request: Request, channel: str):
        q = self.subscribe(channel)
        async def gen():
            try:
                while True:
                    if await request.is_disconnected():
                        break
                    try:
                        data = await asyncio.wait_for(q.get(), timeout=30)
                        yield f"data: {json.dumps(data)}\n\n"
                    except asyncio.TimeoutError:
                        yield ": ping\n\n"
            finally:
                self.unsubscribe(channel, q)
        return StreamingResponse(gen(), media_type="text/event-stream")

sse = SSEManager()