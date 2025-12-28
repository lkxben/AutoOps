import asyncio
import json
import aio_pika
from collections import defaultdict
from app.agent.react_agent import ReactAgent
from app.config import settings
from app.messaging.agent_queue_publisher import AgentQueuePublisher

agent = None
publisher = AgentQueuePublisher()
thread_locks = defaultdict(lambda: asyncio.Lock())

async def get_agent():
    global agent
    if agent is None:
        agent = await ReactAgent.get_instance(settings.AGENT_DB)
    return agent

async def handle_agent_task(payload: dict):
    asyncio.create_task(_handle_agent_task(payload))

async def _handle_agent_task(payload: dict):
    event_type = payload.get("event_type")
    thread_id = payload.get("task_id")
    print(f"[ReactAgentWorker] Processing task {thread_id}")

    agent_instance = await get_agent()
    lock = thread_locks[thread_id]

    async with lock:
        if event_type == "plan_result":
            task = payload.get("task")
            plan = payload.get("plan")
            results = await agent_instance.start_task(thread_id, task, plan)
            # for m in results["messages"]:
            #     m.pretty_print()

        elif event_type == "tool_result":
            tool_result = payload.get("tool_result")
            results = await agent_instance.continue_task(thread_id, tool_result)
            if results:
                for m in results["messages"]:
                    m.pretty_print()