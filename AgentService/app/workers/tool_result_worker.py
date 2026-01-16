import asyncio
import json
import aio_pika
from collections import defaultdict
from app.agent.react_agent import ReactAgent
from app.config import settings
import logging

agent = None
thread_locks = defaultdict(lambda: asyncio.Lock())
logger = logging.getLogger(__name__)

async def get_agent():
    global agent
    if agent is None:
        agent = await ReactAgent.get_instance(settings.AGENT_DB)
    return agent

async def handle_tool_result(payload: dict):
    event_type = payload.get("event_type")
    thread_id = payload.get("task_id")
    user_id = payload.get("user_id")
    tool_result = payload.get("tool_result")
    logger.info(f"[ToolResultWorker] Continuing task {thread_id} after tool call with result {tool_result}")

    agent_instance = await get_agent()
    lock = thread_locks[thread_id]

    async with lock:
        results = await agent_instance.continue_task(thread_id, user_id, tool_result)
        # if results:
        #     for m in results["messages"]:
        #         m.pretty_print()