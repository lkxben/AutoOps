from app.messaging.tool_call_publisher import ToolCallPublisher
from app.messaging.task_updated_publisher import TaskUpdatedPublisher
import re
from typing import Dict, List, Any

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

event_publisher = TaskUpdatedPublisher()

async def publish_result(task_id: str, user_id: str, result: str):
    payload = {
        "task_id": task_id,
        "user_id": user_id,
        "status": "COMPLETED",
        "description": result
    }
    await event_publisher.publish(payload)

async def publish_plan(task_id: str, user_id: str, plan: str):
    payload = {
        "task_id": task_id,
        "user_id": user_id,
        "status": "PLANNED",
        "description": plan
    }
    await event_publisher.publish(payload)

def parse_plan(plan_str: str):
    nodes: Dict[int, Dict[str, Any]] = {}
    edges: List[Dict[str, Any]] = []

    node_pattern = re.compile(r'^(\d+)\|(\w+)\|(.*?)\|(.*)$')
    edge_pattern = re.compile(r'^(\w+)->(\w+)(?: \[condition: (.+)\])?$')

    for line in plan_str.splitlines():
        line = line.strip()
        if not line:
            continue

        if m := node_pattern.match(line):
            node_id = int(m.group(1))
            tool = m.group(2)
            args = dict(arg.split('=') for arg in m.group(3).split(',') if '=' in arg)
            nodes[node_id] = {
                "id": node_id,
                "tool": tool,
                "args": args,
                "description": m.group(4)
            }
        elif m := edge_pattern.match(line):
            src, dest, cond = m.groups()
            edges.append({
                "from": src,
                "to": dest,
                "condition": cond if cond else "true"
            })

    return nodes, edges