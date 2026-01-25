from app.messaging.tool_call_publisher import ToolCallPublisher
from app.messaging.task_updated_publisher import TaskUpdatedPublisher
from app.messaging.plan_draft_publisher import PlanDraftPublisher
from app.agent.mcp import MCPRequest
import re
import json

from typing import Dict, List, Any, Tuple

tool_publisher = ToolCallPublisher()
event_publisher = TaskUpdatedPublisher()
plan_draft_publisher = PlanDraftPublisher()

tool_registry = {
    "add": {
        "description": "Add two integers and return the result.",
        "inputs": ["a", "b"]
    },
    "subtract": {
        "description": "Subtract the second integer from the first integer.",
        "inputs": ["a", "b"]
    },
    "multiply": {
        "description": "Multiply two integers and return the product.",
        "inputs": ["a", "b"]
    },
    "divide": {
        "description": "Divide the first integer by the second integer and return the result. The second integer must not be zero.",
        "inputs": ["a", "b"]
    },
    "modulo": {
        "description": "Return the remainder when the first integer is divided by the second integer.",
        "inputs": ["a", "b"]
    },
    "power": {
        "description": "Raise the first integer to the power of the second integer.",
        "inputs": ["base", "exponent"]
    },
    "absolute": {
        "description": "Return the absolute value of an integer.",
        "inputs": ["a"]
    },
    "search_web": {
        "description": "Search the web for the given query and return a list of urls.",
        "inputs": ["query", "max_results"]
    },
    "web_scrape_text": {
        "description": """
Fetch a webpage and extract its main readable text (no JS, no interaction).
Use after web_search when a relevant URL is known.
Returns cleaned plain text.""",
        "inputs": ["url"]
    },
    "send_notification": {
        "description": "Send a notification to the user via a specified channel such as telegram or email.",
        "inputs": ["channel", "message", "user_id"]
    },
}

async def tool_call(task_id: str, user_id: str, tool_type: str, inputs):
    request = MCPRequest(
        tool_name=tool_type,
        inputs=inputs,
        context={
            "task_id": task_id,
            "user_id": user_id,
        }
    )
    payload = {
        "request": request.dict()
    }
    await tool_publisher.publish(payload)

async def publish_result(task_id: str, user_id: str, result: str):
    payload = {
        "task_id": task_id,
        "user_id": user_id,
        "status": 4,
        "description": result
    }
    await event_publisher.publish(payload)

async def publish_error(task_id: str, user_id: str):
    payload = {
        "task_id": task_id,
        "user_id": user_id,
        "status": 5,
        "description": "LLM failed to call tool"
    }
    await event_publisher.publish(payload)

async def publish_start(task_id: str, user_id: str):
    payload = {
        "task_id": task_id,
        "user_id": user_id,
        "status": 3,
        "description": "Run started"
    }
    await event_publisher.publish(payload)

async def publish_plan_draft(task_id: str, user_id: str, plan: str):
    payload = {
        "task_id": task_id,
        "user_id": user_id,
        "graph": parse_minimal_plan_to_reactflow(plan)
    }
    await plan_draft_publisher.publish(payload)

def parse_minimal_plan(plan_str: str):
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

def complete_minimal_plan(plan_str: str) -> str:
    nodes, edges = parse_minimal_plan(plan_str)

    incoming = {nid: set() for nid in nodes}
    outgoing = {nid: set() for nid in nodes}
    for edge in edges:
        src, dst = edge["from"], edge["to"]
        if src.isdigit() and dst.isdigit():
            src_id, dst_id = int(src), int(dst)
            outgoing[src_id].add(dst_id)
            incoming[dst_id].add(src_id)

    dep_pattern = re.compile(r"\$(\d+)")
    for nid, node in nodes.items():
        for val in node["args"].values():
            for dep_id_str in dep_pattern.findall(str(val)):
                dep_id = int(dep_id_str)
                if dep_id not in incoming[nid]:
                    edges.append({"from": str(dep_id), "to": str(nid), "condition": "true"})
                    outgoing[dep_id].add(nid)
                    incoming[nid].add(dep_id)

    # Connect START to nodes with no incoming edges
    for nid in nodes:
        if not incoming[nid]:
            edges.append({"from": "START", "to": str(nid), "condition": "true"})

    # Connect nodes with no outgoing edges to END
    for nid in nodes:
        if not outgoing[nid]:
            edges.append({"from": str(nid), "to": "END", "condition": "true"})

    plan_lines = []
    for nid in sorted(nodes):
        node = nodes[nid]
        args_str = ",".join(f"{k}={v}" for k, v in node["args"].items())
        plan_lines.append(f"{nid}|{node['tool']}|{args_str}|{node['description']}")

    for edge in edges:
        plan_lines.append(f"{edge['from']}->{edge['to']}")

    return "\n".join(plan_lines)

def parse_minimal_plan_to_reactflow(text: str):
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    nodes = []
    edges = []
    node_ids = set()

    for line in lines:
        if "->" in line:
            src, dst = [x.strip() for x in line.split("->")]
            edges.append({
                "id": f"{src}-{dst}",
                "source": src,
                "target": dst,
                "type": "default"
            })
            continue

        parts = line.split("|")
        node_id = parts[0]
        label = parts[3] if len(parts) > 3 else node_id

        nodes.append({
            "id": node_id,
            "type": "default",
            "position": {"x": 0, "y": 0},
            "data": {
                "label": label
            }
        })

        node_ids.add(node_id)

    if "START" not in node_ids:
        nodes.append({
            "id": "START",
            "type": "input",
            "position": {"x": -200, "y": 0},
            "data": {"label": "START"}
        })
        node_ids.add("START")

    if "END" not in node_ids:
        nodes.append({
            "id": "END",
            "type": "output",
            "position": {"x": 2000, "y": 0},
            "data": {"label": "END"}
        })
        node_ids.add("END")

    return {
        "nodes": nodes,
        "edges": edges
    }

def strip_reactflow_metadata(plan_json: str) -> Dict[str, Any]:
    plan = json.loads(plan_json)

    nodes = []
    for node in plan.get("nodes", []):
        node_id = node.get("id")
        label = node.get("data", {}).get("label", node_id)
        nodes.append({"id": node_id, "label": label})

    edges = []
    for edge in plan.get("edges", []):
        source = edge.get("source")
        target = edge.get("target")
        if source and target:
            edges.append({"source": source, "target": target})

    return {
        "nodes": nodes,
        "edges": edges
    }