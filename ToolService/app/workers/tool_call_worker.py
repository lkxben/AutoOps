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

async def _run_and_publish(fn, inputs: dict, context):
    try:
        sig = inspect.signature(fn)

        if "user_id" in sig.parameters and "user_id" not in inputs:
            inputs = {**inputs, "user_id": context["user_id"]}

        logger.info(f"[ToolWorker] Running tool {fn.__name__} with inputs {inputs}")

        if inspect.iscoroutinefunction(fn):
            result = await fn(**inputs)
        else:
            result = fn(**inputs)

        logger.info(f"[ToolWorker] Tool {fn.__name__} finished successfully")
        
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
            "response": mcp_response.dict()
        })

    except Exception as e:
        logger.exception(f"[ToolWorker] Error running tool {fn.__name__}")
        mcp_response = MCPResponse(
            output={
                "error": str(e)
            },
            context={**context}
        )
        await publisher.publish({
            "event_type": "error",
            "response": mcp_response.dict()
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

    tool_type = mcp_request.tool_name
    inputs = mcp_request.inputs
    context = mcp_request.context
    
    if tool_type not in available_tools:
        mcp_response = MCPResponse(
            output={
                "error": f"Unknown tool: {tool_type}"
            },
            context={**context}
        )
        await publisher.publish({
            "event_type": "error",
            "response": mcp_response.dict()
        })
        return

    fn = available_tools[tool_type]["fn"]
    await _run_and_publish(fn, inputs, context)