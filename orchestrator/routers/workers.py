from fastapi import APIRouter, Request
from sse_manager import sse
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))
from schemas import WorkerRegister
import json

router = APIRouter()

@router.post("/register")
async def register(worker: WorkerRegister, req: Request):
    r = req.app.state.redis
    await r.sadd("worker:pool", worker.worker_id)
    await r.hset(f"worker:{worker.worker_id}:info", mapping={
        "webhook_url": worker.webhook_url,
        "region":      worker.region,
        "cpu_cores":   worker.cpu_cores,
        "job_types":   json.dumps(worker.job_types),
    })
    await r.set(f"worker:{worker.worker_id}:status",     "available")
    await r.set(f"worker:{worker.worker_id}:reputation", "1.0")
    await r.expire(f"worker:{worker.worker_id}:status", 60)
    await r.expire(f"worker:{worker.worker_id}:info",   60)
    await sse.broadcast("company", {
        "type":      "worker_online",
        "worker_id": worker.worker_id,
        "region":    worker.region
    })
    return {"status": "registered"}

@router.delete("/unregister/{worker_id}")
async def unregister(worker_id: str, req: Request):
    r = req.app.state.redis
    await r.srem("worker:pool", worker_id)
    await r.delete(f"worker:{worker_id}:status")
    await sse.broadcast("company", {"type": "worker_offline", "worker_id": worker_id})
    return {"status": "unregistered"}

@router.get("/pool")
async def get_pool(req: Request):
    r = req.app.state.redis
    ids = await r.smembers("worker:pool")
    workers = []
    for wid in ids:
        info   = await r.hgetall(f"worker:{wid}:info")
        status = await r.get(f"worker:{wid}:status")
        rep    = await r.get(f"worker:{wid}:reputation")
        cpu    = await r.get(f"worker:{wid}:cpu_pct")
        workers.append({
            "worker_id":  wid,
            "status":     status,
            "reputation": rep,
            "cpu_pct":    cpu or "0",
            **info
        })
    return workers

@router.get("/regions")
async def get_regions(req: Request):
    r = req.app.state.redis
    ids = await r.smembers("worker:pool")
    regions: dict = {}
    for wid in ids:
        info   = await r.hgetall(f"worker:{wid}:info")
        status = await r.get(f"worker:{wid}:status")
        reg    = info.get("region", "unknown")
        if reg not in regions:
            regions[reg] = {"total": 0, "available": 0}
        regions[reg]["total"] += 1
        if status == "available":
            regions[reg]["available"] += 1
    return regions

@router.post("/heartbeat")
async def heartbeat(req: Request):
    body = await req.json()
    r = req.app.state.redis
    await r.set(f"worker:{body['worker_id']}:cpu_pct", body["cpu_pct"])
    await r.expire(f"worker:{body['worker_id']}:status", 60)
    await r.expire(f"worker:{body['worker_id']}:info", 60)
    await sse.broadcast("company", {
        "type":      "heartbeat",
        "worker_id": body["worker_id"],
        "cpu_pct":   body["cpu_pct"]
    })
    return {"status": "ok"}

@router.post("/update")
async def update_status(req: Request):
    body = await req.json()
    r = req.app.state.redis
    await r.set(f"worker:{body['worker_id']}:status", body["status"])
    return {"status": "ok"}

@router.get("/{worker_id}/stats")
async def worker_stats(worker_id: str, req: Request):
    r = req.app.state.redis
    rep     = await r.get(f"worker:{worker_id}:reputation")
    credits = await r.get(f"worker:{worker_id}:credits")
    cpu     = await r.get(f"worker:{worker_id}:cpu_pct")
    return {
        "worker_id":   worker_id,
        "reputation":  rep or "1.0",
        "credits_usd": credits or "0.0",
        "cpu_pct":     cpu or "0"
    }

@router.post("/available/{worker_id}")
async def mark_available(worker_id: str, req: Request):
    r = req.app.state.redis
    await r.set(f"worker:{worker_id}:status", "available")
    return {"status": "ok"}