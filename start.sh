#!/bin/bash

set -e

# Function to clean up background services
cleanup() {
    echo "Stopping all services..."
    kill $AUTH_PID $API_PID $WORKFLOW_PID $AGENT_PID 2>/dev/null || true
    wait $AUTH_PID $API_PID $WORKFLOW_PID $AGENT_PID 2>/dev/null || true
    echo "All services stopped."
    exit
}

# Trap SIGINT and SIGTERM to call cleanup
trap cleanup SIGINT SIGTERM

echo "Starting AuthService..."
(cd AuthService && dotnet run) &
AUTH_PID=$!

echo "Starting API Gateway..."
(cd ApiGateway && dotnet run) &
API_PID=$!

echo "Starting WorkflowService..."
(cd WorkflowService && dotnet run) &
WORKFLOW_PID=$!

echo "Starting AgentService..."
(cd AgentService && pip install -r requirements.txt && uvicorn app.main:app --reload) &
AGENT_PID=$!

echo "Services started. Press Ctrl+C to stop."

# Wait for all background jobs
wait $AUTH_PID $API_PID $WORKFLOW_PID $AGENT_PID