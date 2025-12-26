import asyncio
import json
import aio_pika
from app.agent.react_agent import ReactAgent
from app.config import settings
from app.messaging.agent_queue_publisher import AgentQueuePublisher

agent = None
publisher = AgentQueuePublisher()

async def get_agent():
    global agent
    if agent is None:
        agent = await ReactAgent.get_instance(settings.AGENT_DB)
    return agent

async def handle_agent_task(payload: dict):
    task_id = payload.get("taskId")
    task = payload.get("task")
    print(f"[ReactWorker] Processing task {task_id}")

    agent_instance = await get_agent()
    results = await agent_instance.run(task, task_id)
    for m in results["messages"]:
        m.pretty_print()

    # await publisher.publish(results)

    print(f"[ReactWorker] Completed task {task_id} and sent to Agent queue")