from fastapi import APIRouter, Request, BackgroundTasks
from sse_manager import sse
from services.job_manager import shard_job
from services.webhook_dispatcher import dispatch_all
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))
from schemas import JobSubmit
import uuid, json

router = APIRouter()

@router.post("/submit")
async def submit_job(job: JobSubmit, req: Request, bg: BackgroundTasks):
    r = req.app.state.redis
    job_id = str(uuid.uuid4())[:8]
    chunks = shard_job(job_id, job.texts)
    await r.hset(f"job:{job_id}:meta", mapping={
        "callback_url": job.callback_url,
        "total_chunks": len(chunks),
        "type":         job.type,
        "status":       "sharding"
    })
    for c in chunks:
        if c["hp_answer"]:
            await r.hset("honeypot:answers",
                         f"{job_id}:{c['chunk_id']}",
                         json.dumps(c["hp_answer"]))
    await sse.broadcast("company", {
        "type":         "job_submitted",
        "job_id":       job_id,
        "total_chunks": len(chunks)
    })
    bg.add_task(dispatch_all, job_id, chunks, job.type, r)
    return {"job_id": job_id, "total_chunks": len(chunks)}

@router.get("/{job_id}/status")
async def job_status(job_id: str, req: Request):
    r = req.app.state.redis
    meta  = await r.hgetall(f"job:{job_id}:meta")
    done  = await r.scard(f"job:{job_id}:done")
    total = int(meta.get("total_chunks", 0))
    return {
        "job_id":          job_id,
        "status":          meta.get("status", "unknown"),
        "chunks_complete": done,
        "chunks_total":    total,
        "progress_pct":    round(done / max(total, 1) * 100)
    }

@router.get("/{job_id}/result")
async def job_result(job_id: str, req: Request):
    r = req.app.state.redis
    meta = await r.hgetall(f"job:{job_id}:meta")
    if meta.get("status") != "complete":
        return {"status": "pending"}
    all_results = await r.hgetall(f"job:{job_id}:results")
    ordered = sorted(all_results.items(), key=lambda x: int(x[0].split("-")[1]))
    return {
        "job_id":     job_id,
        "status":     "complete",
        "embeddings": [json.loads(v) for _, v in ordered]
    }