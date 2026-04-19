# worker-client/main.py
from fastapi import FastAPI, BackgroundTasks
from contextlib import asynccontextmanager
from registrar import register, unregister, re_register_available
from executor import execute_embedding
from schemas import ChunkPayload, ChunkResult
import httpx, config

@asynccontextmanager
async def lifespan(app: FastAPI):
    await register()   # POST to orchestrator on startup
    yield
    await unregister() # cleanup on shutdown

app = FastAPI(title=f"CPUShare Worker — {config.WORKER_ID}", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/status")
async def status():
    """Quick check — curl this during the demo to confirm worker identity."""
    return {
        "worker_id": config.WORKER_ID,
        "region":    config.REGION,
        "job_types": config.JOB_TYPES,
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
        print(f"✗ chunk={chunk.chunk_id} error: {e}")
        result = ChunkResult(
            chunk_id=chunk.chunk_id,
            worker_id=config.WORKER_ID,
            embeddings=[],
            cpu_seconds=0.0,
            status="error",
        )

    async with httpx.AsyncClient() as client:
        await client.post(chunk.callback_url, json=result.model_dump(), timeout=10.0)

    await re_register_available()