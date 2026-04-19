import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import asyncio
import httpx
import psutil
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks

from schemas import ChunkPayload, ChunkResult
from registrar import register, unregister, re_register_available
from executor import execute_embedding
import config


@asynccontextmanager
async def lifespan(app: FastAPI):
    await register()
    task = asyncio.create_task(heartbeat_loop())
    yield
    task.cancel()
    await unregister()


app = FastAPI(title=f"CPUShare Worker — {config.WORKER_ID}", lifespan=lifespan)


async def heartbeat_loop():
    """
    Fires every 10 seconds to tell the orchestrator we're still alive
    and report current CPU usage. The frontend's live CPU meter reads
    this number. Non-fatal if it fails — worker keeps running.
    """
    while True:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{config.ORCHESTRATOR_URL}/workers/heartbeat",
                    json={
                        "worker_id": config.WORKER_ID,
                        "cpu_pct":   psutil.cpu_percent(interval=1),
                        "status":    "available",
                    },
                    timeout=5.0,
                )
                print(f"♡ heartbeat sent | cpu={psutil.cpu_percent()}%")
        except Exception as e:
            print(f"  heartbeat failed (non-fatal): {e}")
        await asyncio.sleep(10)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/status")
async def status():
    return {
        "worker_id": config.WORKER_ID,
        "region":    config.REGION,
        "job_types": config.JOB_TYPES,
        "cpu_pct":   psutil.cpu_percent(),
    }


@app.post("/jobs/incoming")
async def receive_job(chunk: ChunkPayload, bg: BackgroundTasks):
    print(f"→ chunk={chunk.chunk_id} | texts={len(chunk.texts)} | honeypot={chunk.is_honeypot}")
    bg.add_task(process_chunk, chunk)
    return {"status": "accepted", "chunk_id": chunk.chunk_id}


async def process_chunk(chunk: ChunkPayload):
    try:
        embeddings, cpu_seconds = execute_embedding(chunk.texts)
        result = ChunkResult(
            chunk_id=chunk.chunk_id,
            worker_id=config.WORKER_ID,
            embeddings=embeddings,
            cpu_seconds=cpu_seconds,
            status="success",
        )
        print(f"✓ chunk={chunk.chunk_id} done in {cpu_seconds:.2f}s")
    except Exception as e:
        print(f"✗ chunk={chunk.chunk_id} inference error: {e}")
        result = ChunkResult(
            chunk_id=chunk.chunk_id,
            worker_id=config.WORKER_ID,
            embeddings=[],
            cpu_seconds=0.0,
            status="error",
        )

    try:
        async with httpx.AsyncClient() as client:
            await client.post(chunk.callback_url, json=result.model_dump(), timeout=10.0)
    except Exception as e:
        print(f"✗ callback failed: {e}")

    await re_register_available()