from app.messaging.tool_call_publisher import ToolCallPublisher
from app.messaging.task_event_publisher import TaskEventPublisher

tool_registry = {
    "add": {"inputs": ["a", "b"], "description" : "Add a and b"},
    "subtract": {"inputs": ["a", "b"], "description" : "Subtract a and b"},
    "divide": {"inputs": ["a", "b"], "description" : "Divide a and b"},
    "multiply": {"inputs": ["a", "b"], "description" : "Multiply a and b"},
}

tool_publisher = ToolCallPublisher()

async def tool_call(task_id: str, user_id: str, tool_type: str, **kwargs):
    payload = {
        "task_id": task_id,
        "user_id": user_id,
        "tool_type": tool_type,
        "inputs": kwargs
    }
    await tool_publisher.publish(payload)

event_publisher = TaskEventPublisher()

async def publish_result(task_id: str, user_id: str, result: str):
    payload = {
        "task_id": task_id,
        "user_id": user_id,
        "result": result
    }
    await event_publisher.publish(payload)