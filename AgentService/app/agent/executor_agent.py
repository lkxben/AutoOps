import json
import re
import asyncio
import logging
from pydantic import BaseModel, ValidationError
from typing import TypedDict, Annotated, Optional, List, Any, Dict, Literal
from langgraph.graph import StateGraph, START, END, MessagesState
from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage, AnyMessage, SystemMessage, HumanMessage, ToolMessage
from langgraph.graph.message import add_messages
from langgraph.prebuilt import tools_condition, ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from app.agent.agent_helper import tool_call, strip_reactflow_metadata, publish_error, publish_start, publish_result, publish_notification, tool_registry, safe_create_task

logger = logging.getLogger(__name__)

class ExecutorAgent:
    _instance = None

    @classmethod
    async def get_instance(cls, db_uri: str):
        if cls._instance is None:
            cls._instance = ExecutorAgent(db_uri)
            await cls._instance._async_init()
        return cls._instance

    def __init__(self, db_uri: str):
        class Edge(BaseModel):
            source: int
            target: int
            type: Literal["normal", "conditional", "loop"] = "normal"
            condition: Optional[str] = None
            max_iterations: Optional[int] = None

        class ConditionSchema(BaseModel):
            result: bool

        class State(MessagesState):
            context: dict
            run_id: str
            plan: str
            nodes: List[dict] = []
            edges: List[Edge] = []
            dependencies: dict[int, List[int]] = {}
            completed_steps: dict[int, Any]
            current_node: Optional[int] = None
            thoughts: str = ""
            call_final_ans: bool = False
            terminate: bool = False
            notify: bool = False
            answer: str = ""
            node_iterations: Dict[int, int] = {}
            node_state: Dict[int, Literal["pending", "completed", "skipped"]]
            
        self.State = State
        self.db_uri = db_uri

        class NotificationSchema(BaseModel):
            channel: Literal["telegram"]
            message: str

        class ToolCallSchema(BaseModel):
            tool_type: str = None
            inputs: Dict[str, Any] = None
            
        class FinalAnswerSchema(BaseModel):
            answer: str
        
        self.ToolCallSchema = ToolCallSchema
        self.FinalAnswerSchema = FinalAnswerSchema
        self.NotificationSchema = NotificationSchema
        self.Edge = Edge
        self.ConditionSchema = ConditionSchema

        self.tool_descriptions = "\n".join(
            f"{name}({', '.join(info['inputs'])}): {info['description']}"
            for name, info in tool_registry.items()
        )

        self.tool_names = "|".join(
            f"{name}"
            for name, info in tool_registry.items()
        )

        self.llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.0,
            max_tokens=400
        )

    async def _async_init(self):
        async def evaluate_edges(state: self.State):
            ready_nodes = self.get_ready_nodes(state)
            edges = [
                e if isinstance(e, self.Edge) else self.Edge(**e)
                for e in state["edges"]
            ]
            iterations = dict(state.get("node_iterations", {}))
            node_state = dict(state["node_state"])
            completed = state["completed_steps"]

            executable = []

            for node in ready_nodes:
                node_id = node["id"]
                incoming_edges = [e for e in edges if e.target == node_id]
                allow = True

                for edge in incoming_edges:
                    if edge.type == "normal":
                        continue

                    if edge.type == "conditional":
                        decision = await self.llm_check_condition(edge, completed)
                        if not decision:
                            node_state[node_id] = "skipped"
                            allow = False

                    if edge.type == "loop":
                        count = iterations.get(node_id, 0)
                        if edge.condition:
                            result = await self.llm_check_condition(edge, completed)
                            continue_loop = result and (edge.max_iterations is None or count < edge.max_iterations)
                        else:  # for-loop style
                            continue_loop = edge.max_iterations is None or count < edge.max_iterations

                        if continue_loop:
                            node_state[node_id] = "pending"
                            allow = True
                        else:
                            node_state[node_id] = "completed"
                            allow = False


                if allow:
                    executable.append(node)

            if not executable:
                return { "terminate": True, "node_state": node_state }

            executable.sort(key=lambda n: n["id"])

            return {
                "current_node": executable[0]["id"],
                "node_state": node_state
            }

        async def generate_tool_call(state: self.State):
            # logger.info("Generating tool call...")
            nodes = state["nodes"]
            completed_steps = state["completed_steps"]
            current_node = state["current_node"]

            node = next(n for n in nodes if n["id"] == current_node)
            deps = state["dependencies"].get(current_node, [])
            raw_dep_results = {dep_id: completed_steps[dep_id] for dep_id in deps if dep_id in completed_steps}
            
            def build_sys_msg(previous_output, validation_error):
                feedback_block = ""
                if validation_error:
                    feedback_block = f"""
PREVIOUS OUTPUT WAS INVALID:
{previous_output}

VALIDATION ERROR:
{validation_error}

You MUST fix the error and produce a VALID JSON object that matches the schema exactly.
Do NOT repeat the same mistake.
"""

                return SystemMessage(content=f"""
You are an execution agent responsible for executing a single, pre-selected plan node.

Current node to execute (JSON):
{json.dumps(node, indent=2)}

Dependency results:
{json.dumps(raw_dep_results, indent=2)}

{feedback_block}

Rules:
1. Execute ONLY the provided current node.
2. Output EXACTLY ONE JSON object with:
{{
"tool_type": "<tool_name>",
"inputs": {{ ... resolved ... }},
}}
3. Output only JSON. No extra text, no comments, no explanations.
4. Use ONLY the tools listed below.

Available tools:
{self.tool_descriptions}
""")

            tool_call_result = self.invoke_with_retries(
                build_sys_msg=build_sys_msg,
                schema=self.ToolCallSchema
            )

            logger.info(f"Generated Tool Call: {tool_call_result.json()}")
            if tool_call_result.tool_type == "generate_final_answer":
                return {"messages": [AIMessage(content=tool_call_result.json())], "call_final_ans": True }
            
            if tool_call_result.tool_type == "send_notification":
                return {"messages": [AIMessage(content=tool_call_result.json())], "notify": True }

            if not tool_call_result:
                safe_create_task(publish_error(state["context"]), "LLM failed to call tools")
                return {}
                
            return {"messages": [AIMessage(content=tool_call_result.json())]}

        async def call_tools(state: self.State):
            last_msg = state["messages"][-1].content.strip()
            try:
                tool_call_data = json.loads(last_msg)
            except json.JSONDecodeError as e:
                logger.exception(e)

            safe_create_task(publish_start(state["context"]))
            safe_create_task(tool_call(state["context"], tool_call_data["tool_type"], tool_call_data["inputs"]))
            return {}
        
        async def generate_final_answer(state: self.State):
            logger.info("FINAL ANSWER CALLED")
            def build_sys_msg(previous_output, validation_error):
                feedback_block = ""
                if validation_error:
                    feedback_block = f"""
PREVIOUS OUTPUT WAS INVALID:
{previous_output}

VALIDATION ERROR:
{validation_error}

You MUST fix the error and produce a VALID JSON object that strictly conforms to the schema.
Do NOT repeat the same mistake.
"""

                return SystemMessage(content=f"""
You have completed all steps of the task.

Task:
{state['context']['task']['prompt']}

Plan:
{state['plan']}

Results from each step:
{state['completed_steps']}

{feedback_block}

Provide the final answer to the user.

Rules:
1. Output ONLY ONE JSON object.
2. JSON must conform EXACTLY to the schema below.
3. Do NOT include explanations, markdown, or extra text.

Schema:
{{
  "answer": "<final answer>",
}}
""")
            result = self.invoke_with_retries(
                build_sys_msg=build_sys_msg,
                schema=self.FinalAnswerSchema
            )

            if not result:
                safe_create_task(publish_error(state["context"], "LLM failed to generate final answer"))
                return {}

            current_node = state["current_node"] 
            return {
                "completed_steps": {
                    **state["completed_steps"],
                    current_node: {
                        "answer": result.answer
                    }
                },
                "call_final_ans": False,
                "answer": result.answer,
                "node_state": {
                    **state["node_state"],
                    current_node: "completed"
                },
                "messages": [AIMessage(content=result.answer)]
            }

        async def notify(state: self.State):
            logger.info("NOTIFYING")
            node = state["current_node"]
            answer = state["answer"]
            task_info = state["context"]["task"]["prompt"]
            last_results = state["completed_steps"]
            def build_sys_msg(previous_output, validation_error):
                feedback_block = ""
                if validation_error:
                    feedback_block = f"""
PREVIOUS OUTPUT INVALID:
{previous_output}

ERROR:
{validation_error}
"""

                return SystemMessage(content=f"""
You are a notification generator for an autonomous task system.

Your role is to generate a concise and relevant notification message based on the task context, the notification node, recent execution results, and the final answer so far.

Task info:
{json.dumps(task_info, indent=2)}

Notification node:
{json.dumps(node, indent=2)}

Previous completed steps (recent 3):
{json.dumps(last_results, indent=2)}

Final answer so far (may be blank):
{json.dumps(answer, indent=2)}

Guidelines:

- Generate a clear, concise, and informative message describing the result or event.
- Do NOT ask questions.
- Do NOT include reasoning or workflow details.
- Do NOT restate the task description.
- Keep the message short (1–3 sentences).
- No emojis.
- No markdown formatting.

Output EXACTLY one JSON object:
{{ "channel": "<channel_name>", "message": "<notification text>" }}

{feedback_block}
""")

            result = self.invoke_with_retries(build_sys_msg, self.NotificationSchema)
            if not result:
                safe_create_task(publish_error(state["context"], "LLM failed to generate notification"))
                return {}
            safe_create_task(publish_notification(state["context"], result.channel, result.message))

            current_node = state["current_node"] 
            return {
                "completed_steps": {
                    **state["completed_steps"],
                    current_node: {
                        "done": True
                    }
                },
                "node_state": {
                    **state["node_state"],
                    current_node: "completed"
                },
                "notify": False
            }

        async def publish_end(state: self.State):
            message = state.get("answer") or "Task completed successfully"
            await publish_result(state["context"], message)
            logger.info(f"Workflow {state['context']['run_id']} completed with message: {message}")
            return {"terminate": True, "current_node": None}
                
        def should_end(state: self.State):
            if state["terminate"]:
                return "publish_end"
            return "generate_tool_call"
        
        def next_step(state: self.State):
            if state["call_final_ans"]:
                return "generate_final_answer"
            if state["notify"]:
                return "notify"
            return "tools"
                
        # Compiling
        builder = StateGraph(self.State)
        builder.add_node("evaluate_edges", evaluate_edges)
        builder.add_node("generate_tool_call", generate_tool_call)
        builder.add_node("tools", call_tools)
        builder.add_node("generate_final_answer", generate_final_answer)
        builder.add_node("publish_end", publish_end)
        builder.add_node("notify", notify)

        builder.add_edge(START, "evaluate_edges")
        builder.add_conditional_edges(
            "evaluate_edges", should_end, ["publish_end", "generate_tool_call"]
        )

        builder.add_conditional_edges("generate_tool_call", next_step, ["generate_final_answer", "tools", "notify"])
        builder.add_edge("tools", "evaluate_edges")
        builder.add_edge("notify", "evaluate_edges")
        builder.add_edge("generate_final_answer", "evaluate_edges")
        builder.add_edge("publish_end", END)
        self.builder = builder

    async def start_task(self, context: dict, plan: str):
        thread = {"configurable": {"thread_id": context["run_id"]}}

        stripped = strip_reactflow_metadata(plan)
        nodes = stripped["nodes"]
        edges = stripped["edges"]

        logger.info(f"NODES: {nodes}")
        logger.info(f"EDGES: {edges}")

        dependencies = {node["id"]: [] for node in nodes}
        for edge in edges:
            target = edge["target"]
            source = edge["source"]
            dependencies[target].append(source)

        # form Edge objects from reactflow edges
        edges_objs = [
            self.Edge(
                source=e["source"],
                target=e["target"],
                type=e.get("type", "normal"),
                condition=e.get("condition"),
                max_iterations=e.get("max_iterations")
            )
            for e in edges
        ]

        logger.info(f"Parsed edges: {edges_objs}")

        node_state = {node["id"]: "pending" for node in nodes}
        node_iterations = {node["id"]: 0 for node in nodes}

        initial_state = {
            "context": context,
            "plan": stripped,
            "nodes": nodes,
            "edges": edges_objs,
            "dependencies": dependencies,
            "completed_steps": {},
            "current_node": None,
            "thoughts": "",
            "call_final_ans": False, 
            "terminate": False,
            "notify": False,
            "answer": "",
            "node_iterations": node_iterations,
            "node_state": node_state
        }

        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            graph = self.builder.compile(interrupt_after=["tools"], checkpointer=checkpointer)
            try:
                await graph.ainvoke(initial_state, thread)
            except Exception as e:
                logger.exception("Error starting graph")

    async def continue_task(self, context: dict, tool_result: dict):
        thread = {"configurable": {"thread_id": context["run_id"]}}

        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            checkpoint = await checkpointer.aget(thread)
            state = dict(checkpoint["channel_values"])

            current_node = state["current_node"] 
            completed_steps = dict(state.get("completed_steps", {}))
            completed_steps[current_node] = tool_result

            node_iterations = dict(state.get("node_iterations", {}))
            node_iterations[current_node] = node_iterations.get(current_node, 0) + 1

            node_state = dict(state["node_state"])
            node_state[current_node] = "completed"
        
            graph = self.builder.compile(interrupt_after=["tools"], checkpointer=checkpointer)

            await graph.aupdate_state(
                thread,
                {
                    "completed_steps": completed_steps, 
                    "node_state": node_state,
                    "node_iterations": node_iterations
                }
            )
            try:
                await graph.ainvoke(None, config=thread)
            except Exception as e:
                logger.exception("Error continuing graph")
            
    def invoke_with_retries(self, build_sys_msg, schema, max_attempts: int = 3):
        last_output = None
        last_error = None

        for attempt in range(1, max_attempts + 1):
            sys_msg = build_sys_msg(last_output, last_error)

            ai_message = self.llm.invoke([sys_msg])
            raw = ai_message.content
            logger.info(f"Raw: {raw}")

            try:
                parsed = json.loads(raw)
                validated = schema(**parsed)
                return validated

            except (json.JSONDecodeError, ValidationError) as e:
                last_output = raw
                last_error = str(e)
                logger.info(f"Attempt {attempt} failed: {last_error}")

        logger.error("All retries failed")
        return None
    
    def get_ready_nodes(self, state):
        ready_nodes = []
        node_state = state["node_state"]

        def satisfied(dep):
            return node_state.get(dep) in {"completed", "skipped"}

        for node in state["nodes"]:
            node_id = node["id"]
            if node_id in ("START", "END") or node_state[node_id] != "pending":
                continue
            if all(satisfied(d) for d in state["dependencies"].get(node_id, [])):
                ready_nodes.append(node)
        return ready_nodes

    async def llm_check_condition(self, edge, completed_steps):
        logger.info("CHECKING CONDITION")
        def build_sys_msg(previous_output=None, validation_error=None):
            feedback_block = ""
            if validation_error:
                feedback_block = f"""
PREVIOUS OUTPUT WAS INVALID:
{previous_output}

VALIDATION ERROR:
{validation_error}

You MUST fix the error and produce a VALID JSON object that strictly conforms to the schema.
Do NOT repeat the same mistake.
"""

            return SystemMessage(content=f"""
You are an execution agent evaluating a workflow condition in a workflow node.

Condition to evaluate:
{edge.condition}

Completed workflow steps (JSON):
{json.dumps(completed_steps, indent=2)}

{feedback_block}

Rules:
1. Evaluate the condition using the outputs from previous steps.
2. You may extract numbers or categorical information from text if necessary.
3. Do NOT invent data that isn’t present.
4. Respond ONLY in the exact JSON format below.

Required JSON output:
{{
"result": True/False
}}
""")

        result = self.invoke_with_retries(build_sys_msg, self.ConditionSchema)
        return result.result