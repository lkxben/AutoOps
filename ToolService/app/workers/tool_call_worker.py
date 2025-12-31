import asyncio
import inspect
from app.messaging.agent_queue_publisher import AgentQueuePublisher
import app.tools.all_tools as all_tools

available_tools = {}

for name, fn in inspect.getmembers(all_tools, inspect.isfunction):
    sig = inspect.signature(fn)
    available_tools[name] = {
        "fn": fn,
        "inputs": list(sig.parameters.keys()),
        "description": fn.__doc__ or ""
    }

publisher = AgentQueuePublisher()

async def _run_and_publish(task_id: str, user_id: str, fn, inputs: dict):
    try:
        if inspect.iscoroutinefunction(fn):
            result = await fn(**inputs)
        else:
            result = fn(**inputs)

        await publisher.publish({
            "event_type": "tool_result",
            "task_id": task_id,
            "user_id": user_id,
            "tool_result": {
                "tool_type": fn.__name__,
                "inputs": inputs,
                "output": result
            }
        })

    except Exception as e:
        await publisher.publish({
            "event_type": "error",
            "task_id": task_id,
            "user_id": user_id,
            "error": str(e)
        })

def handle_tool_call(payload: dict):
    task_id = payload.get("task_id")
    user_id = payload.get("user_id")
    tool_type = payload.get("tool_type")
    inputs = payload.get("inputs", {})

    print(f"[ToolWorker] Calling tool {tool_type} with inputs {inputs}")

    if tool_type not in available_tools:
        asyncio.create_task(
            publisher.publish({
                "event_type": "error",
                "task_id": task_id,
                "user_id": user_id,
                "error": f"Unknown tool: {tool_type}"
            })
        )
        return

    fn = available_tools[tool_type]["fn"]
    asyncio.create_task(_run_and_publish(task_id, user_id, fn, inputs))