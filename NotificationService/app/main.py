import asyncio
from fastapi import FastAPI
from app.messaging.notif_call_consumer import start_notif_call_consumer
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
        "notif": asyncio.create_task(start_notif_call_consumer())
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