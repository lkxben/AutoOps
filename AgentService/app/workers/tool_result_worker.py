import asyncio
import json
import aio_pika
import logging
from collections import defaultdict
from app.agent.react_agent import ReactAgent
from app.agent.executor_agent import ExecutorAgent
from app.config import settings
from app.agent.mcp import MCPResponse

agent = None
thread_locks = defaultdict(lambda: asyncio.Lock())
logger = logging.getLogger(__name__)

async def get_agent():
    global agent
    if agent is None:
        agent = await ExecutorAgent.get_instance(settings.AGENT_DB)
    return agent

async def handle_tool_result(payload: dict):
    event_type = payload.get("event_type")
    thread_id = payload.get("task_id")
    user_id = payload.get("user_id")
    response_data = payload.get("response")

    if not response_data:
        logger.error(f"[ToolResultWorker] No response in payload for thread {thread_id}")
        return

    try:
        mcp_response = MCPResponse(**response_data)
    except Exception as e:
        logger.error(f"[ToolResultWorker] Invalid MCPResponse for thread {thread_id}: {e}")
        return

    tool_result = mcp_response.output
    context = mcp_response.context

    logger.info(f"[ToolResultWorker] Continuing task {thread_id} after tool call with result {tool_result}")

    agent_instance = await get_agent()
    lock = thread_locks[thread_id]

    async with lock:
        results = await agent_instance.continue_task(thread_id, user_id, tool_result)
        # if results:
        #     for m in results["messages"]:
        #         m.pretty_print()