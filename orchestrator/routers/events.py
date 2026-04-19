from fastapi import APIRouter, Request
from sse_manager import sse

router = APIRouter()

@router.get("/{channel}")
async def stream_events(channel: str, req: Request):
    return await sse.stream(req, channel)