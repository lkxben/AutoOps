import asyncio
import json
import aio_pika
from app.agent.planning_agent import PlanningAgent
from app.config import settings
from app.messaging.agent_queue_publisher import AgentQueuePublisher

agent = None
publisher = AgentQueuePublisher()

async def get_agent():
    global agent
    if agent is None:
        agent = await PlanningAgent.get_instance(settings.AGENT_DB)
    return agent

async def handle_workflow_task(payload: dict):
    msg_data = payload.get("message", {})
    task_id = msg_data.get("taskId")
    input_data = msg_data.get("inputData")
    print(f"[PlanningWorker] Processing task {task_id}")

    agent_instance = await get_agent()
    results = await agent_instance.run(input_data, task_id)

    payload_to_send = {
        "taskId": task_id,
        "task": input_data,
    }

    await publisher.publish(payload_to_send)

    print(f"[PlanningWorker] Completed task {task_id} and sent to Agent queue")