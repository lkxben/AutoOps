import asyncio
from fastapi import FastAPI
from app.messaging.task_created_consumer import start_task_created_consumer
from app.messaging.agent_queue_consumer import start_agent_queue_consumer

app = FastAPI()

@app.on_event("startup")
async def startup():
    asyncio.create_task(start_task_created_consumer())
    asyncio.create_task(start_agent_queue_consumer())

@app.get("/health")
def health():
    return {"status": "ok"}