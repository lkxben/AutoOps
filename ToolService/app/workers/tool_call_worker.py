import asyncio
import inspect
from app.messaging.tool_result_publisher import ToolResultPublisher
import app.tools.tools as tools
import logging
from app.workers.mcp import MCPResponse, MCPRequest

logger = logging.getLogger(__name__)

available_tools = {}

for name, fn in inspect.getmembers(tools, inspect.isfunction):
    sig = inspect.signature(fn)
    available_tools[name] = {
        "fn": fn,
        "inputs": list(sig.parameters.keys()),
        "description": fn.__doc__ or ""
    }

publisher = ToolResultPublisher()

async def _run_and_publish(task_id: str, user_id: str, fn, inputs: dict, context):
    try:
        sig = inspect.signature(fn)

        if "user_id" in sig.parameters and "user_id" not in inputs:
            inputs = {**inputs, "user_id": user_id}

        if inspect.iscoroutinefunction(fn):
            result = await fn(**inputs)
        else:
            result = fn(**inputs)
        
        mcp_response = MCPResponse(
            output={
                "tool_type": fn.__name__,
                "inputs": inputs,
                "result": result
            },
            context={**context}
        )

        await publisher.publish({
            "event_type": "tool_result",
            "task_id": task_id,
            "user_id": user_id,
            "response": mcp_response.dict()
        })

    except Exception as e:
        await publisher.publish({
            "event_type": "error",
            "task_id": task_id,
            "user_id": user_id,
            "error": str(e)
        })

async def handle_tool_call(payload: dict):
    request_data = payload.get("request")
    if not request_data:
        logger.error("[ToolWorker] No request in payload")
        return

    try:
        mcp_request = MCPRequest(**request_data)
    except Exception as e:
        logger.error(f"[ToolWorker] Invalid MCPRequest: {e}")
        return

    task_id = mcp_request.context.get("task_id")
    user_id = mcp_request.context.get("user_id")
    tool_type = mcp_request.tool_name
    inputs = mcp_request.inputs
    context = mcp_request.context

    logger.info(f"[ToolWorker] Calling tool {tool_type} with inputs {inputs}")

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
    await _run_and_publish(task_id, user_id, fn, inputs, context)