import asyncio

async def handle_task(payload: dict):
    task_id = payload.get("id")
    input_data = payload.get("input")

    print(f"[Worker] Processing task {task_id}")

    # simulate work
    await asyncio.sleep(2)

    print(f"[Worker] Completed task {task_id}")