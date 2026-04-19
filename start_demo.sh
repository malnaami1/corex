#!/bin/bash
# start_demo.sh — run before demo, sets up both workers

# Colors for readable output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting CPUShare demo environment...${NC}"

# Check orchestrator is reachable
if [ -z "$ORCHESTRATOR_URL" ]; then
  echo -e "${RED}Error: ORCHESTRATOR_URL not set${NC}"
  echo "Usage: ORCHESTRATOR_URL=http://<dev-a-ip>:8000 ./start_demo.sh"
  exit 1
fi

echo -e "${YELLOW}Orchestrator: $ORCHESTRATOR_URL${NC}"

# Start honest worker in background
echo -e "${GREEN}Starting honest worker (worker-alpha) on :8080...${NC}"
cd worker-client
WORKER_ID=worker-alpha \
REGION=us-east-1 \
ORCHESTRATOR_URL=$ORCHESTRATOR_URL \
uvicorn main:app --host 0.0.0.0 --port 8080 &
HONEST_PID=$!

echo -e "${GREEN}✓ Honest worker started (PID $HONEST_PID)${NC}"
echo ""
echo -e "${YELLOW}To trigger honeypot demo, run in a new terminal:${NC}"
echo "  cd worker-client && ORCHESTRATOR_URL=$ORCHESTRATOR_URL uvicorn bad_worker:app --port 8082"
echo ""
echo "Press Ctrl+C to stop all workers"

# Keep script alive, kill worker on exit
trap "kill $HONEST_PID 2>/dev/null; echo 'Workers stopped'" EXIT
wait