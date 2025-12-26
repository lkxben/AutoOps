import asyncio
from fastapi import FastAPI
from app.messaging.tool_call_consumer import start_tool_call_consumer

app = FastAPI()

@app.on_event("startup")
async def startup():
    asyncio.create_task(start_tool_call_consumer())

@app.get("/health")
def health():
    return {"status": "ok"}