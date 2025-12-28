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
    task_id = msg_data.get("task_id")
    input_data = msg_data.get("input_data")
    print(f"[PlanningWorker] Processing task {task_id}")

    agent_instance = await get_agent()
    results = await agent_instance.run(input_data, task_id)

    payload_to_send = {
        "event_type": "plan_result",
        "task_id": task_id,
        "task": input_data,
        "plan": results["messages"][-1].content
    }
    
    print(f"SENT PLAN: {results["messages"][-1].content}")
    print(f"[PlanningWorker] Completed task {task_id} and sent to Agent queue")
    await publisher.publish(payload_to_send)