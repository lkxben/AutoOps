import asyncio
from fastapi import FastAPI
from app.messaging.task_created_consumer import start_task_created_consumer
from app.messaging.tool_result_consumer import start_tool_result_consumer
from app.messaging.plan_created_consumer import start_plan_created_consumer
import logging
import sys

root = logging.getLogger()
root.setLevel(logging.INFO)

handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
handler.setFormatter(formatter)

if not root.handlers:
    root.addHandler(handler)

logger = logging.getLogger(__name__)

app = FastAPI()

@app.on_event("startup")
async def startup():
    app.state.consumers = {
        "task_created": asyncio.create_task(start_task_created_consumer()),
        "tool_result": asyncio.create_task(start_tool_result_consumer()),
        "plan_created": asyncio.create_task(start_plan_created_consumer()),
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.on_event("shutdown")
async def shutdown_event():
    for t in app.state.consumers.values():
        t.cancel()
        try:
            await t
        except asyncio.CancelledError:
            pass