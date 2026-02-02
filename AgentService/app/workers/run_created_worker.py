import asyncio
import json
import aio_pika
from collections import defaultdict
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

async def handle_run(payload: dict):
    msg_data = payload.get("message", {})
    task = {
        "task_id": msg_data.get("task_id"),
        "user_id": msg_data.get("user_id"),
        "prompt": msg_data.get("prompt"),
        "title": msg_data.get("title"),
    }
    context = {
        "run_id": msg_data.get("run_id"),
        "task": task
    }
    plan = msg_data.get("graph")
    logger.info(f"[RunCreatedWorker] Starting run {context['run_id']} for task: {task['title']}")

    agent_instance = await get_agent()
    lock = thread_locks[context["run_id"]]

    async with lock:
        results = await agent_instance.start_task(context, plan)