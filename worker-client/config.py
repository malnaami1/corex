# worker-client/config.py
import os, socket

ORCHESTRATOR_URL = os.getenv("ORCHESTRATOR_URL", "http://localhost:8000")
WORKER_ID        = os.getenv("WORKER_ID", f"worker-{socket.gethostname()}")
REGION           = os.getenv("REGION", "us-east-1")
CPU_CORES        = int(os.getenv("CPU_CORES", "8"))
JOB_TYPES        = ["embedding"]
MIN_PAYOUT_RATE  = 0.002
WEBHOOK_PORT     = 8080

# To run a second worker on the same network:
# WORKER_ID=worker-laptop2 REGION=us-west-2 python main.py