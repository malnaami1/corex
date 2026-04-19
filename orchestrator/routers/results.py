from fastapi import APIRouter, Request
from sse_manager import sse
from services.honeypot import verify_honeypot
from services.billing import calculate_cost
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))
from schemas import ChunkResult
import json, httpx

router = APIRouter()

@router.post("/{job_id}/{chunk_id}")
async def receive_result(job_id: str, chunk_id: str,
                         result: ChunkResult, req: Request):
    r = req.app.state.redis

    # check if this was a honeypot
    hp_key = f"{job_id}:{chunk_id}"
    hp_ans = await r.hget("honeypot:answers", hp_key)

    if hp_ans:
        correct = json.loads(hp_ans)
        passed  = verify_honeypot(result.embeddings, correct)
        rep     = float(await r.get(f"worker:{result.worker_id}:reputation") or 1.0)
        if passed:
            new_rep = round(min(rep + 0.05, 2.0), 4)
            await r.set(f"worker:{result.worker_id}:reputation", new_rep)
            await sse.broadcast("company", {
                "type":      "honeypot_pass",
                "worker_id": result.worker_id,
                "job_id":    job_id,
                "chunk_id":  chunk_id
            })
        else:
            new_rep = round(max(rep - 0.2, 0.0), 4)
            await r.set(f"worker:{result.worker_id}:reputation", new_rep)
            await sse.broadcast("company", {
                "type":      "honeypot_fail",
                "worker_id": result.worker_id,
                "job_id":    job_id,
                "chunk_id":  chunk_id
            })
            # re-mark worker available and bail — chunk will be reassigned
            await r.set(f"worker:{result.worker_id}:status", "available")
            return {"status": "flagged_reassigned"}

    # store valid result
    await r.hset(f"job:{job_id}:results", chunk_id, json.dumps(result.embeddings))
    await r.sadd(f"job:{job_id}:done", chunk_id)
    await r.set(f"worker:{result.worker_id}:status", "available")
    await sse.broadcast("company", {
        "type":     "chunk_complete",
        "job_id":   job_id,
        "chunk_id": chunk_id
    })

    # check if job is fully complete
    meta  = await r.hgetall(f"job:{job_id}:meta")
    done  = await r.scard(f"job:{job_id}:done")
    total = int(meta.get("total_chunks", 0))

    if done >= total:
        await aggregate_and_deliver(job_id, meta, r)

    return {"status": "stored"}


async def aggregate_and_deliver(job_id: str, meta: dict, r):
    all_results = await r.hgetall(f"job:{job_id}:results")
    ordered     = sorted(all_results.items(), key=lambda x: int(x[0].split("-")[1]))
    all_embeddings = []
    for _, emb_json in ordered:
        all_embeddings.extend(json.loads(emb_json))

    billing = calculate_cost(len(all_embeddings))

    payload = {
        "job_id":             job_id,
        "status":             "complete",
        "embeddings":         all_embeddings,
        "total_embeddings":   len(all_embeddings),
        **billing
    }

    async with httpx.AsyncClient() as client:
        try:
            await client.post(meta["callback_url"], json=payload, timeout=10.0)
        except Exception:
            pass  # callback failure shouldn't crash the orchestrator

    await r.hset(f"job:{job_id}:meta", "status", "complete")
    await sse.broadcast("company", {
        "type":               "job_complete",
        "job_id":             job_id,
        **billing
    })