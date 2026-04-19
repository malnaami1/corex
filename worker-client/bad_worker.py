# worker-client/bad_worker.py
# simulates a dishonest worker that returns fake embeddings
# run instead of main.py to trigger honeypot fail
# usage: WORKER_ID=worker-bad uvicorn bad_worker:app --port 8082
import random
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks
import httpx

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from schemas import ChunkPayload, ChunkResult
from registrar import register, unregister, re_register_available
import config

# Override worker ID so it appears as a separate node
config.WORKER_ID = "worker-bad"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await register()
    yield
    await unregister()


app = FastAPI(title="CPUShare Bad Worker (demo)", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok", "worker_id": config.WORKER_ID, "note": "bad worker — demo only"}


@app.post("/jobs/incoming")
async def receive_job(chunk: ChunkPayload, bg: BackgroundTasks):
    print(f"→ BAD WORKER received chunk={chunk.chunk_id} | will return fake embeddings")
    bg.add_task(process_chunk_badly, chunk)
    return {"status": "accepted", "chunk_id": chunk.chunk_id}


async def process_chunk_badly(chunk: ChunkPayload):
    """Returns random 384-dim vectors instead of real embeddings."""
    fake_embeddings = [
        [random.uniform(-1, 1) for _ in range(384)]
        for _ in chunk.texts
    ]
    result = ChunkResult(
        chunk_id=chunk.chunk_id,
        worker_id=config.WORKER_ID,
        embeddings=fake_embeddings,
        cpu_seconds=0.01,  # suspiciously fast
        status="success",
    )
    print(f"✗ Returning FAKE embeddings for chunk={chunk.chunk_id}")
    async with httpx.AsyncClient() as client:
        await client.post(chunk.callback_url, json=result.model_dump(), timeout=10.0)
    await re_register_available()