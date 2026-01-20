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

class ReactAgent:
    _instance = None

    @classmethod
    async def get_instance(cls, db_uri: str):
        if cls._instance is None:
            cls._instance = ReactAgent(db_uri)
            await cls._instance._async_init()
        return cls._instance

    def __init__(self, db_uri: str):
        class State(MessagesState):
            task: str
            plan: str
            nodes: List[dict] = []
            edges: List[dict] = []
            dependencies: dict[int, List[int]] = {}
            completed_steps: dict[int, Any]
            previous_node: Optional[int] = None
            execution_history: List[int] = []
            thoughts: str = ""
            final: bool = False
            
        self.State = State
        self.db_uri = db_uri

        class ReactOutputSchema(BaseModel):
            node: int = None
            tool_type: str = None
            inputs: Dict[str, Any] = None
            thoughts: Optional[str] = None
            
        class FinalAnswerSchema(BaseModel):
            answer: str
            thoughts: str
        
        self.ReactOutputSchema = ReactOutputSchema
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

        self.react_llm = self.llm.with_structured_output(ReactOutputSchema)
        self.final_llm = self.llm.with_structured_output(FinalAnswerSchema)

    async def _async_init(self):
        def generate_tool_call(state: self.State):
            plan = state["plan"]
            task = state["task"]
            completed_steps = state["completed_steps"]
            execution_history = state["execution_history"]
            previous_node = state["previous_node"]
            sys_msg = SystemMessage(content=f"""
You are an execution agent responsible for carrying out a pre-approved plan.

Task:
{task}

Plan:
{plan}

State:
Completed steps with results: {completed_steps}
Execution history (order of nodes executed): {execution_history}
Previous node executed: {previous_node}

Rules:
1. Execute exactly one node at a time.
2. Do NOT modify, reorder, or reinterpret the plan.
3. Resolve all $<node> references in inputs using the results of completed steps.
4. Decide the next node to execute yourself based on completed steps, execution history, and plan dependencies.
5. Output EXACTLY ONE JSON object with:
   {{
       "node": <node_id>,
       "tool_type": "<tool_name>",
       "inputs": {{ ... resolved ... }},
       "thoughts": "optional reasoning or notes"
   }}
6. Output only JSON. No extra text, no comments, no explanations.
7. Use ONLY the tools listed below.

Available tools:
{self.tool_descriptions}
""")

            tool_call_result = self.invoke_with_retries(lambda: self.llm.invoke([sys_msg]), self.ReactOutputSchema)

            if not tool_call_result:
                return {"messages": [sys_msg], "previous_node": None}
            
            # print(f"REACT OUTPUT: {tool_call_result}")
            return {"messages": [sys_msg, AIMessage(content=tool_call_result.json())], "previous_node": tool_call_result.node}

        def get_next_node(state: ReactAgent.State):
            nodes = state["nodes"]
            dependencies = state["dependencies"]
            completed_steps = state["completed_steps"]

            ready_nodes = []

            for node in nodes:
                node_id = node["id"]
                if node_id in completed_steps:
                    continue

                node_deps = dependencies.get(node_id, [])
                if all(dep in completed_steps for dep in node_deps):
                    ready_nodes.append(node)

            if not ready_nodes:
                return { "final": True }

            next_node = min(ready_nodes, key=lambda n: n["id"])

            return {
                "previous_node": next_node["id"]
            }

        def call_tools(state: self.State):
            pass
            # last_msg = results["messages"][-1].content.strip()
            # try:
            #     tool_call_data = json.loads(last_msg)
            # except json.JSONDecodeError:
            #     return results
            
            # asyncio.create_task(publish_start(thread_id, user_id))
            # asyncio.create_task(tool_call(thread_id, user_id, tool_call_data["tool_type"], tool_call_data["inputs"]))
        
        def final_answer(state: self.State):
            summary_prompt = f"""
You have completed all steps of the task.

Task:
{state['task']}

Plan:
{state['plan']}

Results from each step:
{state['completed_steps']}


Provide the final answer to the user. Include brief thought process under "thoughts" field.
Output ONLY JSON conforming to the schema:
{{
  "answer": "<final answer>",
  "thoughts": "<reasoning, maximum 300 characters>"
}}
Do NOT include extra text. Make sure the JSON is valid and complete. 
If your reasoning is too long, summarise it so it fits within the limit.
"""
            result = self.invoke_with_retries(lambda: self.llm.invoke([summary_prompt]), self.FinalAnswerSchema)

            if not result:
                return {"messages": [summary_prompt], "previous_node": None}

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

        builder.add_edge("generate_tool_call", "tool")
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
            "completed_steps": {},
            "previous_node": None,
            "execution_history": [],
            "thoughts": "",
            "final": False, 
            "nodes": nodes,
            "edges": edges,
            "dependencies": dependencies
        }

        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            graph = self.builder.compile(interrupt_after=["tools"], checkpointer=checkpointer)
            await graph.ainvoke(initial_state, thread)

    async def continue_task(self, thread_id: str, user_id: str, tool_result: dict):
        thread = {"configurable": {"thread_id": thread_id}}

        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            checkpoint = await checkpointer.aget(thread)
            state = dict(checkpoint["channel_values"])

            previous_node = state["previous_node"] 
            completed_steps = dict(state.get("completed_steps", {}))
            completed_steps[previous_node] = tool_result
            execution_history = state.get("execution_history", [])
            execution_history.append(previous_node)
        
            graph = self.builder.compile(interrupt_before=["get_next_node"], checkpointer=checkpointer) ### CHECK IF THIS WORKS

            await graph.aupdate_state(
                thread,
                {"completed_steps": completed_steps, "execution_history": execution_history}
            )
            await graph.ainvoke(None, config=thread)
            
    def invoke_with_retries(self, llm_call, schema, max_attempts: int = 3):
        for attempt in range(1, max_attempts + 1):
            ai_message = llm_call()
            result_str = ai_message.content
            try:
                result_json = json.loads(result_str)
                
                validated = schema(**result_json)
                return validated
            except (json.JSONDecodeError, ValidationError) as e:
                logger.info(f"Attempt {attempt} failed: {e}")
                if attempt == max_attempts:
                    logger.error("All retries failed")
                    return None