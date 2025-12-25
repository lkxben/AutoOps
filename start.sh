#!/bin/bash
set -e

# Function to kill background jobs
cleanup() {
  echo "Stopping all services..."
  ps aux | grep -E "dotnet run|uvicorn app.main:app" | grep -v grep | awk '{print $2}' | xargs -r kill
  exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT

(cd AuthService && dotnet run) &
(cd ApiGateway && dotnet run) &
(cd WorkflowService && dotnet run) &
(cd AgentService && pip install -r requirements.txt && uvicorn app.main:app --reload) &

# Wait for all background jobs
wait