from app.messaging.tool_call_publisher import ToolCallPublisher

tool_registry = {
    "add": {"inputs": ["a", "b"], "description" : "Add a and b"},
    "subtract": {"inputs": ["a", "b"], "description" : "Subtract a and b"},
    "divide": {"inputs": ["a", "b"], "description" : "Divide a and b"},
    "multiply": {"inputs": ["a", "b"], "description" : "Multiply a and b"},
}

publisher = ToolCallPublisher()

async def tool_call(task_id: str, user_id: str, tool_type: str, **kwargs):
    payload = {
        "task_id": task_id,
        "user_id": user_id,
        "tool_type": tool_type,
        "inputs": kwargs
    }
    await publisher.publish(payload)