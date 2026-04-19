# worker-client/registrar.py
# worker introduces itself to the orchestrator
import asyncio
import socket
import httpx, config
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from schemas import WorkerRegister


def get_local_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    finally:
        s.close()


async def register(retries: int = 5, delay: float = 2.0):
    """
    Retries registration so the worker survives a slow orchestrator startup.
    Tries up to `retries` times with `delay` seconds between attempts.
    """
    payload = WorkerRegister(
        worker_id=config.WORKER_ID,
        webhook_url=f"http://{get_local_ip()}:{config.WEBHOOK_PORT}/jobs/incoming",
        region=config.REGION,
        cpu_cores=config.CPU_CORES,
        job_types=config.JOB_TYPES,
        min_payout_rate=config.MIN_PAYOUT_RATE,
    )
    for attempt in range(1, retries + 1):
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{config.ORCHESTRATOR_URL}/workers/register",
                    json=payload.model_dump(),
                    timeout=5.0,
                )
                resp.raise_for_status()
            print(f"✓ Registered | id={config.WORKER_ID} | url={payload.webhook_url}")
            return
        except Exception as e:
            print(f"  Registration attempt {attempt}/{retries} failed: {e}")
            if attempt < retries:
                await asyncio.sleep(delay)
    raise RuntimeError("Could not register with orchestrator after max retries")


async def re_register_available():
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{config.ORCHESTRATOR_URL}/workers/available/{config.WORKER_ID}",
            timeout=5.0,
        )


async def unregister():
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{config.ORCHESTRATOR_URL}/workers/unregister/{config.WORKER_ID}",
            timeout=5.0,
        )
    print(f"✓ Unregistered {config.WORKER_ID}")