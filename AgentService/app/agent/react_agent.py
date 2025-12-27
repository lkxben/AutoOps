import json
import asyncio
from langgraph.graph import StateGraph, START, END, MessagesState
from langchain_groq import ChatGroq
from typing import TypedDict, Annotated, Optional
from langchain_core.messages import AIMessage, AnyMessage, SystemMessage, HumanMessage, ToolMessage
from langgraph.graph.message import add_messages
from langgraph.prebuilt import tools_condition, ToolNode
from langgraph.checkpoint.memory import MemorySaver
from app.agent.agent_tools import add, subtract, multiply, divide, tool_call
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from pydantic import BaseModel
from typing import Any, Dict
import uuid

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
            last_tool_call: dict = {}
            thoughts: str = ""
            
        self.State = State
        self.db_uri = db_uri

        class ReactOutputSchema(BaseModel):
            tool_type: Optional[str] = None
            inputs: Optional[Dict[str, Any]] = None
            final_answer: Optional[Any] = None
            thoughts: Optional[str] = None
        
        self.ReactOutputSchema = ReactOutputSchema

        tool_registry = {
            "add": {"inputs": ["a", "b"], "description" : "Add a and b"},
            "subtract": {"inputs": ["a", "b"], "description" : "Subtract a and b"},
            "divide": {"inputs": ["a", "b"], "description" : "Divide a and b"},
            "multiply": {"inputs": ["a", "b"], "description" : "Multiply a and b"},
        }

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
            temperature=0.3,
            max_tokens=100
        )

        self.llm = self.llm.with_structured_output(ReactOutputSchema)

    async def _async_init(self):
        def react(state: self.State):
            plan = state["plan"]
            task = state["task"]
            last_tool_call = state.get("last_tool_call", {})
            executor_instructions = f"""
            You are executing a previously approved plan to accomplish the task: {task}.
            You will perform **one tool call at a time**, and wait for its result before proceeding to the next step.

            Plan:
            {plan}

            You are executing a plan for a task. Follow these rules exactly:

            1. Only provide one JSON object per response.
            2. If a step requires a tool call, ONLY output "tool_type" and "inputs".
            3. NEVER include "final_answer" until **all steps of the plan are fully complete**.
            4. Do NOT repeat previous tool calls.
            5. Include "thoughts" optionally for reasoning.
            6. Keep track of plan progress internally.

            Available tools:
            {self.tool_descriptions}
            """
            tool_call_result = self.llm.invoke([SystemMessage(content=executor_instructions)] + state["messages"])
            state["last_tool_call"] = tool_call_result.dict()
            print(state.get("thoughts", "No thoughts yet"))
            return {"messages": [AIMessage(content=tool_call_result.json())]} # add more
        
        def dummy_node(state: self.State):
            return state
        
        def should_end(state):
            last_msg = state["messages"][-1].content
            try:
                data = json.loads(last_msg)
                if data.get("final_answer") is not None:
                    return END
                elif data.get("tool_type") is not None:
                    return "tools"
                else:
                    return "react"  # stay in react until a valid output
            except json.JSONDecodeError:
                return "react"

        # Compiling
        builder = StateGraph(self.State)
        builder.add_node("react", react)
        builder.add_node("tools", dummy_node)
        builder.add_conditional_edges(
            "react", should_end, [END, "tools", "react"]
        )
        builder.add_edge(START, "react")
        builder.add_edge("tools", "react")
        self.builder = builder

    async def start_task(self, thread_id: str, task: str, plan: str):
        thread = {"configurable": {"thread_id": thread_id}}
        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            graph = self.builder.compile(interrupt_before=["tools"], checkpointer=checkpointer)
            results = await graph.ainvoke({"task": task, "plan": plan}, thread)
        
        last_msg = results["messages"][-1].content.strip()
        try:
            tool_call_data = json.loads(last_msg)
        except json.JSONDecodeError:
            return results
        
        if tool_call_data["final_answer"]:
            return results
        
        asyncio.create_task(tool_call(thread_id, tool_call_data["tool_type"], **tool_call_data["inputs"]))
        return results

    async def continue_task(self, thread_id: str, tool_result: dict):
        thread = {"configurable": {"thread_id": thread_id}}

        tool_msg = ToolMessage(
            content=json.dumps(tool_result),
            tool_call_id=str(uuid.uuid4())
        )

        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            graph = self.builder.compile(checkpointer=checkpointer)
            state = await checkpointer.aget(thread)
            state = state["channel_values"]
            sys_msg = SystemMessage(content=f"""
            You are executing a previously approved plan to accomplish the task: {state["task"]}.
            You will only perform **one tool call at a time**, waiting for the result before moving to the next step.

            Plan:
            {state["plan"]}

            Previously executed tool:
            {state.get("last_tool_call", {})}

            Result of that tool:
            {tool_result}

            Rules:
            - Respond with exactly one JSON object.
            - Use "tool_type" and "inputs" for the next tool call.
            - Include optional "thoughts" for reasoning/debugging.
            - Only include "final_answer" when all steps of the plan are complete.

            Available tools:
            {self.tool_descriptions}
            """)

            results = await graph.ainvoke(
                None,
                updates={"messages": [
                    sys_msg
                ]},
                config=thread
            )
        
        last_msg = results["messages"][-1].content.strip()
        try:
            tool_call_data = json.loads(last_msg)
        except json.JSONDecodeError:
            return results
        
        if tool_call_data["final_answer"]:
            return results
        
        asyncio.create_task(tool_call(thread_id, tool_call_data["tool_type"], **tool_call_data["inputs"]))
        return results