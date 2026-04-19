from pydantic import BaseModel
from typing import List
 
# ── Orchestrator → Worker (webhook dispatch) ──
class ChunkPayload(BaseModel):
    job_id: str
    chunk_id: str
    type: str                  # "embedding" for now
    texts: List[str]
    callback_url: str          # where worker POSTs the result back
    is_honeypot: bool = False
 
# ── Worker → Orchestrator (result) ──
class ChunkResult(BaseModel):
    chunk_id: str
    worker_id: str
    embeddings: List[List[float]]
    cpu_seconds: float
    status: str                # "success" or "error"
 
# ── Worker → Orchestrator (register on startup) ──
class WorkerRegister(BaseModel):
    worker_id: str
    webhook_url: str           # orchestrator calls this to send chunks
    region: str                # e.g. "us-east-1"
    cpu_cores: int
    job_types: List[str]       # e.g. ["embedding"]
    min_payout_rate: float = 0.002
 
# ── Company → Orchestrator (job submission) ──
class JobSubmit(BaseModel):
    texts: List[str]
    callback_url: str          # orchestrator calls this when job is fully done
    type: str = "embedding"
 