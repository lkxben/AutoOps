import asyncio
import json
import aio_pika
import inspect
from app.config import settings
import app.tools.all_tools as all_tools
from app.messaging.agent_queue_publisher import AgentQueuePublisher

available_tools = {}

for name, fn in inspect.getmembers(all_tools, inspect.isfunction):
    sig = inspect.signature(fn)
    available_tools[name] = {
        "fn": fn,
        "inputs": list(sig.parameters.keys()),
        "description": fn.__doc__ or ""
    }

publisher = AgentQueuePublisher()

async def handle_tool_call(payload: dict):
    task_id = payload.get("task_id")
    tool_type = payload.get("tool_type")
    inputs = payload.get("inputs", {})

    if tool_type not in available_tools:
        await publisher.publish({
            "event_type": "error",
            "task_id": task_id,
            "error": f"Unknown tool: {tool_type}"
        })
        return

    print(f"[ToolWorker] Processing tool call for task {task_id}")
    print("HERE")

    fn = available_tools[tool_type]["fn"]

    try:
        if inspect.iscoroutinefunction(fn):
            result = await fn(**inputs)
        else:
            result = fn(**inputs)

        print(f"[ToolWorker] Completed tool call for task {task_id} and sent to Agent queue, RESULT: {result}")
        await publisher.publish({
            "event_type": "tool_result",
            "task_id": task_id,
            "tool_result": {
                "tool_type": tool_type,
                "inputs": inputs,
                "output": result
            }
        })

    except Exception as e:
        await publisher.publish({
            "event_type": "error",
            "task_id": task_id,
            "error": str(e)
        })