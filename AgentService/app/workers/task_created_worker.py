import asyncio
import json
import aio_pika
from app.agent.planning_agent import PlanningAgent
from app.config import settings

agent = None

async def get_agent():
    global agent
    if agent is None:
        agent = await PlanningAgent.get_instance(settings.AGENT_DB)
    return agent

async def handle_workflow_task(payload: dict):
    msg_data = payload.get("message", {})
    task_id = msg_data.get("task_id")
    user_id = msg_data.get("user_id")
    input_data = msg_data.get("input_data")
    print(f"[TaskCreatedWorker] Drafting plan for task {task_id}")

    agent_instance = await get_agent()
    results = await agent_instance.run(task_id, user_id, input_data)