from app.messaging.tool_call_publisher import ToolCallPublisher
from app.messaging.run_updated_publisher import RunUpdatedPublisher
from app.messaging.plan_draft_publisher import PlanDraftPublisher
from app.messaging.notif_call_publisher import NotifCallPublisher
from app.agent.mcp import MCPRequest
import asyncio
import re
import json
import logging

from typing import Dict, List, Any, Tuple, Coroutine

logger = logging.getLogger(__name__)
tool_publisher = ToolCallPublisher()
event_publisher = RunUpdatedPublisher()
plan_draft_publisher = PlanDraftPublisher()
notif_pub = NotifCallPublisher()

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
#     "search_web": {
#         "description": "Search the web for the given query and return a list of urls.",
#         "inputs": ["query", "max_results"]
#     },
#     "web_scrape_text": {
#         "description": """
# Fetch a webpage and extract its main readable text (no JS, no interaction).
# Use after web_search when a relevant URL is known.
# Returns cleaned plain text.""",
#         "inputs": ["url"]
#     },
    "research": {
        "description": "Perform bounded web research using LLM to generate search query, parse articles, and extract answer with sources.",
        "inputs": ["task", "question"],
    },
    "send_notification": {
        "description": "Send a notification to the user via a specified channel such as telegram or email.",
        "inputs": []
    },
    "generate_final_answer": {
        "description": "Generate the final result based on past execution. Do NOT produce results yourself or include any previous outputs. This tool does not require any inputs.",
        "inputs": []
    }
}

async def publish_notification(context: dict, channel: str, message: str):
    await notif_pub.publish({
        "context": context,
        "channel": channel,
        "message": message
    })

async def tool_call(task: dict, tool_type: str, inputs):
    request = MCPRequest(
        tool_name=tool_type,
        inputs=inputs,
        context=task,
    )
    payload = {
        "request": request.dict()
    }
    await tool_publisher.publish(payload)

async def publish_plan_draft(task_id: str, user_id: str, plan: str):
    payload = {
        "task_id": task_id,
        "user_id": user_id,
        "graph": parse_minimal_plan_to_reactflow(plan)
    }
    await plan_draft_publisher.publish(payload)

async def publish_start(context: dict):
    payload = {
        "run_id": context["run_id"],
        "user_id": context["task"]["user_id"],
        "task_id": context["task"]["task_id"],
        "status": 1,
        "description": "Run started"
    }
    await event_publisher.publish(payload)

async def publish_result(context: dict, result: str):
    payload = {
        "run_id": context["run_id"],
        "user_id": context["task"]["user_id"],
        "task_id": context["task"]["task_id"],
        "status": 2,
        "description": result
    }
    await event_publisher.publish(payload)

async def publish_error(context: dict):
    payload = {
        "run_id": context["run_id"],
        "user_id": context["task"]["user_id"],
        "task_id": context["task"]["task_id"],
        "status": 3,
        "description": "LLM failed to call tool"
    }
    await event_publisher.publish(payload)

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

# def complete_minimal_plan(plan_str: str) -> str:
#     nodes, edges = parse_minimal_plan(plan_str)

#     incoming = {nid: set() for nid in nodes}
#     outgoing = {nid: set() for nid in nodes}
#     for edge in edges:
#         src, dst = edge["from"], edge["to"]
#         if src.isdigit() and dst.isdigit():
#             src_id, dst_id = int(src), int(dst)
#             outgoing[src_id].add(dst_id)
#             incoming[dst_id].add(src_id)

#     dep_pattern = re.compile(r"\$(\d+)")
#     for nid, node in nodes.items():
#         for val in node["args"].values():
#             for dep_id_str in dep_pattern.findall(str(val)):
#                 dep_id = int(dep_id_str)
#                 if dep_id not in incoming[nid]:
#                     edges.append({"from": str(dep_id), "to": str(nid), "condition": "true"})
#                     outgoing[dep_id].add(nid)
#                     incoming[nid].add(dep_id)

#     # Connect START to nodes with no incoming edges
#     for nid in nodes:
#         if not incoming[nid]:
#             edges.append({"from": "START", "to": str(nid), "condition": "true"})

#     # Connect nodes with no outgoing edges to END
#     for nid in nodes:
#         if not outgoing[nid]:
#             edges.append({"from": str(nid), "to": "END", "condition": "true"})

#     plan_lines = []
#     for nid in sorted(nodes):
#         node = nodes[nid]
#         args_str = ",".join(f"{k}={v}" for k, v in node["args"].items())
#         plan_lines.append(f"{nid}|{node['tool']}|{args_str}|{node['description']}")

#     for edge in edges:
#         plan_lines.append(f"{edge['from']}->{edge['to']}")

#     return "\n".join(plan_lines)

def parse_minimal_plan_to_reactflow(text: str):
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    nodes = []
    edges = []
    node_ids = set()
    indegree={}
    outdegree={}

    for line in lines:
        if "->" in line:
            src, rhs = [x.strip() for x in line.split("->", 1)]

            condition = None
            edge_type = "normal"

            if "|condition:" in rhs:
                dst, condition = [x.strip() for x in rhs.split("|condition:", 1)]
                edge_type = "conditional"
            else:
                dst = rhs.strip()

            edges.append({
                "id": f"{src}-{dst}-{edge_type}",
                "source": src,
                "target": dst,
                "type": "conditional" if edge_type == "conditional" else "default",
                "label": condition if edge_type == "conditional" else None,
                "data": {
                    "edgeType": edge_type,
                    "condition": condition,
                    "maxIterations": None
                }
            })
            node_ids.add(src)
            node_ids.add(dst)
            indegree[dst]=indegree.get(dst,0)+1
            outdegree[src]=outdegree.get(src,0)+1
            indegree.setdefault(src,indegree.get(src,0))
            outdegree.setdefault(dst,outdegree.get(dst,0))
            continue

        parts = line.split("|")
        node_id = parts[0]
        label = parts[2] if len(parts) > 2 else node_id

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
            "id":"START",
            "type":"input",
            "position":{"x":-200,"y":0},
            "data":{"label":"START"}
        })
        node_ids.add("START")
        indegree["START"]=0
        outdegree["START"]=0
    if "END" not in node_ids:
        nodes.append({
            "id":"END",
            "type":"output",
            "position":{"x":2000,"y":0},
            "data":{"label":"END"}
        })
        node_ids.add("END")
        indegree["END"]=0
        outdegree["END"]=0
    for nid in list(node_ids):
        if nid not in ("START","END"):
            if indegree.get(nid,0)==0:
                edges.append({
                    "id":f"START-{nid}",
                    "source":"START",
                    "target":nid,
                    "type":"default",
                    "data":{
                        "edgeType":"normal",
                        "condition":None,
                        "maxIterations":None
                    }
                })
                outdegree["START"]=outdegree.get("START",0)+1
                indegree[nid]=indegree.get(nid,0)+1
            if outdegree.get(nid,0)==0:
                edges.append({
                    "id":f"{nid}-END",
                    "source":nid,
                    "target":"END",
                    "type":"default",
                    "data":{
                        "edgeType":"normal",
                        "condition":None,
                        "maxIterations":None
                    }
                })
                outdegree[nid]=outdegree.get(nid,0)+1
                indegree["END"]=indegree.get("END",0)+1
    return {"nodes":nodes,"edges":edges}

def strip_reactflow_metadata(plan_json: str) -> dict[str, Any]:
    plan = json.loads(plan_json)

    nodes = [
        {
            "id": int(node["id"]),
            "label": node.get("data", {}).get("label", str(node["id"]))
        }
        for node in plan.get("nodes", [])
        if node["id"] not in ("START", "END")
    ]

    edges = [
        {
            "source": int(edge["source"]),
            "target": int(edge["target"]),
            "type": edge.get("data", {}).get("edgeType", "normal"),
            "condition": edge.get("data", {}).get("condition"),
            "max_iterations": edge.get("data", {}).get("maxIterations")
        }
        for edge in plan.get("edges", [])
        if edge.get("source") not in ("START", "END") and edge.get("target") not in ("START", "END")
    ]

    return {
        "nodes": nodes,
        "edges": edges
    }

def safe_create_task(coro: Coroutine[Any, Any, Any]):
    task = asyncio.create_task(coro)
    
    def log_exception(t: asyncio.Task):
        try:
            t.result()
        except Exception as e:
            logger.exception("Exception in fire-and-forget task", exc_info=e)
    
    task.add_done_callback(log_exception)
    return task