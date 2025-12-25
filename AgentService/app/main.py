import asyncio
from fastapi import FastAPI
from app.messaging.consumer import start_consumer

app = FastAPI()

@app.on_event("startup")
async def startup():
    asyncio.create_task(start_consumer())

@app.get("/health")
def health():
    return {"status": "ok"}