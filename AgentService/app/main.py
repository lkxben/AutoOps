import asyncio
from fastapi import FastAPI
from app.messaging.task_created_consumer import start_task_created_consumer
from app.messaging.tool_result_consumer import start_tool_result_consumer
from app.messaging.plan_created_consumer import start_plan_created_consumer

app = FastAPI()

@app.on_event("startup")
async def startup():
    asyncio.create_task(start_task_created_consumer())
    asyncio.create_task(start_tool_result_consumer())
    asyncio.create_task(start_plan_created_consumer())

@app.get("/health")
def health():
    return {"status": "ok"}