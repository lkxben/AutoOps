import asyncio
from fastapi import FastAPI
from app.messaging.workflow_consumer import start_workflow_consumer
from app.messaging.react_consumer import start_react_consumer

app = FastAPI()

@app.on_event("startup")
async def startup():
    asyncio.create_task(start_workflow_consumer())
    asyncio.create_task(start_react_consumer())

@app.get("/health")
def health():
    return {"status": "ok"}