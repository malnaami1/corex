from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import workers, jobs, results, events
from redis_client import get_redis

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(workers.router, prefix="/workers")
app.include_router(jobs.router,    prefix="/jobs")
app.include_router(results.router, prefix="/results")
app.include_router(events.router,  prefix="/events")

@app.on_event("startup")
async def startup():
    app.state.redis = await get_redis()

@app.get("/health")
async def health():
    return {"status": "ok", "service": "corex-orchestrator"}