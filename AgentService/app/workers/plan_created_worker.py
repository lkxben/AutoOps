import asyncio
import json
import aio_pika
from collections import defaultdict
from app.agent.react_agent import ReactAgent
from app.agent.executor_agent import ExecutorAgent
from app.config import settings
import logging

agent = None
thread_locks = defaultdict(lambda: asyncio.Lock())
logger = logging.getLogger(__name__)

async def get_agent():
    global agent
    if agent is None:
        agent = await ExecutorAgent.get_instance(settings.AGENT_DB)
    return agent

async def handle_plan(payload: dict):
    msg_data = payload.get("message", {})
    thread_id = msg_data.get("task_id")
    user_id = msg_data.get("user_id")
    prompt = msg_data.get("prompt")
    plan = msg_data.get("graph")
    logger.info(f"[PlanCreatedWorker] Starting task {thread_id}")

    agent_instance = await get_agent()
    lock = thread_locks[thread_id]

    async with lock:
        results = await agent_instance.start_task(thread_id, user_id, prompt, plan)