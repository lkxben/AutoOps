import asyncio
from app.agent.agent import Agent

async def handle_task(payload: dict):
    msg_data = payload.get("message", {})

    task_id = msg_data.get("taskId")
    input_data = msg_data.get("inputData")

    print(f"[Worker] Processing task {task_id} with input: {input_data}")

    agent = Agent()
    results = agent.run(input_data, task_id)
    for m in results["messages"]:
        m.pretty_print()

    print(f"[Worker] Completed task {task_id}")