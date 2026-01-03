import asyncio
import json
import aio_pika
from collections import defaultdict
from app.agent.planning_agent import PlanningAgent
from app.config import settings

agent = None
thread_locks = defaultdict(lambda: asyncio.Lock())

async def get_agent():
    global agent
    if agent is None:
        agent = await PlanningAgent.get_instance(settings.AGENT_DB)
    return agent

async def handle_workflow_task(payload: dict):
    msg_data = payload.get("message", {})
    thread_id = msg_data.get("task_id")
    user_id = msg_data.get("user_id")
    input_data = msg_data.get("input_data")
    print(f"[TaskCreatedWorker] Drafting plan for task {thread_id}")

    agent_instance = await get_agent()
    lock = thread_locks[thread_id]
    
    async with lock:
        results = await agent_instance.run(thread_id, user_id, input_data)