import json
import re
import asyncio
import logging
from pydantic import BaseModel, ValidationError
from typing import TypedDict, Annotated, Optional, List, Any, Dict
from langgraph.graph import StateGraph, START, END, MessagesState
from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage, AnyMessage, SystemMessage, HumanMessage, ToolMessage
from langgraph.graph.message import add_messages
from langgraph.prebuilt import tools_condition, ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from app.agent.agent_helper import tool_call, publish_result, strip_reactflow_metadata, publish_error, publish_start, tool_registry

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
        class State(MessagesState):
            task: str
            plan: str
            nodes: List[dict] = []
            edges: List[dict] = []
            dependencies: dict[int, List[int]] = {}
            thread_id: str
            user_id: str
            completed_steps: dict[int, Any]
            current_node: Optional[int] = None
            execution_history: List[int] = []
            thoughts: str = ""
            final: bool = False
            
        self.State = State
        self.db_uri = db_uri

        class ToolCallSchema(BaseModel):
            tool_type: str = None
            inputs: Dict[str, Any] = None
            thoughts: Optional[str] = None
            
        class FinalAnswerSchema(BaseModel):
            answer: str
            thoughts: str
        
        self.ToolCallSchema = ToolCallSchema
        self.FinalAnswerSchema = FinalAnswerSchema

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
            max_tokens=100
        )

        self.react_llm = self.llm.with_structured_output(ToolCallSchema)
        self.final_llm = self.llm.with_structured_output(FinalAnswerSchema)

    async def _async_init(self):
        async def generate_tool_call(state: self.State):
            logger.info("Generating tool call...")
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
"thoughts": "optional reasoning or notes"
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
            if not tool_call_result:
                asyncio.create_task(publish_error(state["thread_id"], state["user_id"]))
                return {}
                
            return {"messages": [AIMessage(content=tool_call_result.json())]}

        def get_next_node(state: self.State):
            logger.info("Getting next node...")
            nodes = state["nodes"]
            dependencies = state["dependencies"]
            completed_steps = state["completed_steps"]

            ready_nodes = []

            for node in nodes:
                node_id = node["id"]

                if node_id in ("START", "END"):
                    continue

                if node_id in completed_steps:
                    continue

                node_deps = [
                    dep for dep in dependencies.get(node_id, [])
                    if dep not in ("START", "END")
                ]

                if all(dep in completed_steps for dep in node_deps):
                    ready_nodes.append(node)

            if not ready_nodes:
                logger.info("Get next node: none")
                return { "final": True }

            next_node = min(ready_nodes, key=lambda n: n["id"])

            logger.info(f"Get next node: {next_node}")
            return {
                "current_node": next_node["id"],
            }

        async def call_tools(state: self.State):
            last_msg = state["messages"][-1].content.strip()
            try:
                tool_call_data = json.loads(last_msg)
            except json.JSONDecodeError as e:
                logger.exception(e)

            thread_id = state["thread_id"]
            user_id = state["user_id"]
            asyncio.create_task(publish_start(thread_id, user_id))
            asyncio.create_task(tool_call(thread_id, user_id, tool_call_data["tool_type"], tool_call_data["inputs"]))
            return {}
        
        async def final_answer(state: self.State):
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
{state['task']}

Plan:
{state['plan']}

Results from each step:
{state['completed_steps']}

{feedback_block}

Provide the final answer to the user.

Rules:
1. Output ONLY ONE JSON object.
2. JSON must conform EXACTLY to the schema below.
3. "thoughts" must be concise (maximum 300 characters).
4. Do NOT include explanations, markdown, or extra text.

Schema:
{{
  "answer": "<final answer>",
  "thoughts": "<reasoning, max 300 chars>"
}}
""")
            result = self.invoke_with_retries(
                build_sys_msg=build_sys_msg,
                schema=self.FinalAnswerSchema
            )

            if not result:
                asyncio.create_task(publish_error(state["thread_id"], state["user_id"]))
                return {}

            asyncio.create_task(publish_result(state["thread_id"], state["user_id"], result.answer))
            return {"messages": [AIMessage(content=result.answer)]}
        
        def should_end(state: self.State):
            if state["final"]:
                return "final"
            return "generate_tool_call"
                
        # Compiling
        builder = StateGraph(self.State)
        builder.add_node("get_next_node", get_next_node)
        builder.add_node("generate_tool_call", generate_tool_call)
        builder.add_node("tools", call_tools)
        builder.add_node("final", final_answer)

        builder.add_edge(START, "get_next_node")
        builder.add_conditional_edges(
            "get_next_node", should_end, ["final", "generate_tool_call"]
        )

        builder.add_edge("generate_tool_call", "tools")
        builder.add_edge("tools", "get_next_node")

        builder.add_edge("final", END)
        self.builder = builder

    async def start_task(self, thread_id: str, user_id: str, task: str, plan: str):
        thread = {"configurable": {"thread_id": thread_id}}

        stripped = strip_reactflow_metadata(plan)
        nodes = stripped["nodes"]
        edges = stripped["edges"]

        dependencies = {node["id"]: [] for node in nodes}
        for edge in edges:
            target = edge["target"]
            source = edge["source"]
            dependencies[target].append(source)

        initial_state = {
            "task": task,
            "plan": stripped,
            "nodes": nodes,
            "edges": edges,
            "dependencies": dependencies,
            "thread_id": thread_id,
            "user_id": user_id,
            "completed_steps": {},
            "current_node": None,
            "execution_history": [],
            "thoughts": "",
            "final": False, 
        }

        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            graph = self.builder.compile(interrupt_after=["tools"], checkpointer=checkpointer)
            try:
                await graph.ainvoke(initial_state, thread)
            except Exception as e:
                logger.exception("Error starting graph")

    async def continue_task(self, thread_id: str, user_id: str, tool_result: dict):
        thread = {"configurable": {"thread_id": thread_id}}

        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            checkpoint = await checkpointer.aget(thread)
            state = dict(checkpoint["channel_values"])

            current_node = state["current_node"] 
            completed_steps = dict(state.get("completed_steps", {}))
            completed_steps[current_node] = tool_result
            execution_history = state.get("execution_history", [])
            execution_history.append(current_node)
        
            graph = self.builder.compile(interrupt_after=["tools"], checkpointer=checkpointer)

            await graph.aupdate_state(
                thread,
                {"completed_steps": completed_steps, "execution_history": execution_history}
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