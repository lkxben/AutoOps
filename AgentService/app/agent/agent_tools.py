from app.messaging.tool_call_publisher import ToolCallPublisher

tool_registry = {
    "add": {"inputs": ["a", "b"], "description" : "Add a and b"},
    "subtract": {"inputs": ["a", "b"], "description" : "Subtract a and b"},
    "divide": {"inputs": ["a", "b"], "description" : "Divide a and b"},
    "multiply": {"inputs": ["a", "b"], "description" : "Multiply a and b"},
}

publisher = ToolCallPublisher()

async def tool_call(task_id: str, tool_type: str, **kwargs):
    payload = {
        "event_type": "tool_call",
        "task_id": task_id,
        "tool_type": tool_type,
        "inputs": kwargs
    }
    await publisher.publish(payload)

def add(a: int, b: int) -> int:
    """Add a and b.

    Args:
        a: first int
        b: second int
    """
    return a + b

def subtract(a: int, b: int) -> int:
    """Subtract a and b.

    Args:
        a: first int
        b: second int
    """
    return a - b

def multiply(a: int, b: int) -> int:
    """Multiply a and b.

    Args:
        a: first int
        b: second int
    """
    return a * b

def divide(a: int, b: int) -> int:
    """Divide a and b.

    Args:
        a: first int
        b: second int
    """
    return a / b