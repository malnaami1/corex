import httpx, json, asyncio
from sse_manager import sse

async def pick_worker(r, job_types: list):
    ids = await r.smembers("worker:pool")
    best, best_rep = None, -1.0
    for wid in ids:
        status = await r.get(f"worker:{wid}:status")
        rep    = float(await r.get(f"worker:{wid}:reputation") or 0)
        if status == "available" and rep > best_rep:
            info  = await r.hgetall(f"worker:{wid}:info")
            types = json.loads(info.get("job_types", "[]"))
            if any(t in types for t in job_types):
                best     = {"worker_id": wid, **info}
                best_rep = rep
    return best

async def dispatch_all(job_id: str, chunks: list, job_type: str, r):
    base_cb = f"http://localhost:8000/results/{job_id}"
    queue   = list(chunks)
    while queue:
        chunk  = queue.pop(0)
        worker = await pick_worker(r, [job_type])
        if not worker:
            await asyncio.sleep(2)
            queue.insert(0, chunk)
            continue
        await r.set(f"worker:{worker['worker_id']}:status", "busy")
        payload = {
            "job_id":       job_id,
            "chunk_id":     chunk["chunk_id"],
            "type":         job_type,
            "texts":        chunk["texts"],
            "callback_url": f"{base_cb}/{chunk['chunk_id']}",
            "is_honeypot":  chunk["is_honeypot"]
        }
        try:
            async with httpx.AsyncClient() as client:
                await client.post(worker["webhook_url"], json=payload, timeout=5.0)
            await sse.broadcast("company", {
                "type":      "chunk_dispatched",
                "job_id":    job_id,
                "chunk_id":  chunk["chunk_id"],
                "worker_id": worker["worker_id"]
            })
        except Exception:
            await r.set(f"worker:{worker['worker_id']}:status", "available")
            queue.insert(0, chunk)