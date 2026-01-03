import asyncio
import json
import aio_pika
from collections import defaultdict
from app.agent.react_agent import ReactAgent
from app.config import settings

agent = None
thread_locks = defaultdict(lambda: asyncio.Lock())

async def get_agent():
    global agent
    if agent is None:
        agent = await ReactAgent.get_instance(settings.AGENT_DB)
    return agent

async def handle_plan(payload: dict):
    msg_data = payload.get("message", {})
    thread_id = msg_data.get("task_id")
    user_id = msg_data.get("user_id")
    task_description = msg_data.get("task_description")
    plan = msg_data.get("plan")
    print(f"[PlanCreatedWorker] Starting task {thread_id}")

    agent_instance = await get_agent()
    lock = thread_locks[thread_id]

    async with lock:
        results = await agent_instance.start_task(thread_id, user_id, task_description, plan)