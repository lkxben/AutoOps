import asyncio
import logging
import sys
import asyncpg
from fastapi import FastAPI, HTTPException, Body, Request
from pydantic import BaseModel
from app.messaging.notif_call_consumer import start_notif_call_consumer
from app.config import settings

root = logging.getLogger()
root.setLevel(logging.INFO)

handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
handler.setFormatter(formatter)

if not root.handlers:
    root.addHandler(handler)

logger = logging.getLogger(__name__)

app = FastAPI()

db_pool: asyncpg.Pool | None = None

@app.on_event("startup")
async def startup():
    app.state.consumers = {
        "notif": asyncio.create_task(start_notif_call_consumer())
    }
    global db_pool
    db_pool = await asyncpg.create_pool(dsn=settings.NOTIF_DB, min_size=1, max_size=10)
    async with db_pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_notification_channels (
                user_id TEXT NOT NULL,
                channel TEXT NOT NULL,
                address TEXT NOT NULL,
                PRIMARY KEY (user_id, channel)
            )
        """)

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
    global db_pool
    if db_pool:
        await db_pool.close()

class AddChannelRequest(BaseModel):
    user_id: str
    channel: str
    address: str

class UpdateChannelRequest(BaseModel):
    user_id: str
    address: str

class UserIdRequest(BaseModel):
    user_id: str

class ChannelResponse(BaseModel):
    channel: str
    address: str

@app.middleware("http")
async def log_requests(request: Request, call_next):
    body = await request.body()
    print(f"Request path: {request.url.path}, body: {body.decode()}")
    response = await call_next(request)
    return response

@app.post("/notifications/channels", status_code=201)
async def add_channel(req: AddChannelRequest):
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO user_notification_channels (user_id, channel, address)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, channel)
            DO UPDATE SET address = EXCLUDED.address
            """,
            req.user_id, req.channel, req.address,
        )

@app.put("/notifications/channels/{channel}")
async def update_channel(channel: str, req: UpdateChannelRequest):
    async with db_pool.acquire() as conn:
        result = await conn.execute(
            """
            UPDATE user_notification_channels
            SET address = $1
            WHERE user_id = $2 AND channel = $3
            """,
            req.address, req.user_id, channel,
        )
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Channel not found")

@app.delete("/notifications/channels/{channel}", status_code=204)
async def delete_channel(channel: str, req: UserIdRequest):
    async with db_pool.acquire() as conn:
        result = await conn.execute(
            """
            DELETE FROM user_notification_channels
            WHERE user_id = $1 AND channel = $2
            """,
            req.user_id, channel,
        )
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Channel not found")

@app.get("/notifications/channels", response_model=list[ChannelResponse])
async def list_channels(req: UserIdRequest):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT channel, address
            FROM user_notification_channels
            WHERE user_id = $1
            """,
            req.user_id,
        )
        return [ChannelResponse(channel=row["channel"], address=row["address"]) for row in rows]