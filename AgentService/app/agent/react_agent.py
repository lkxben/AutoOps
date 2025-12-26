import json
import asyncio
from langgraph.graph import StateGraph, START, END, MessagesState
from langchain_groq import ChatGroq
from typing import TypedDict, Annotated, Optional
from langchain_core.messages import AIMessage, AnyMessage, SystemMessage, HumanMessage
from langgraph.graph.message import add_messages
from langgraph.prebuilt import tools_condition, ToolNode
from langgraph.checkpoint.memory import MemorySaver
from app.agent.agent_tools import add, subtract, multiply, divide
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

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
            
        self.State = State
        self.db_uri = db_uri

        self.tools = [multiply, divide, add, subtract]
        self.tools_description = "\n".join(f"{t.__name__}: {t.__doc__}" for t in self.tools)

        self.llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.3,
            max_tokens=100
        )

        self.llm_with_tools = self.llm.bind_tools(self.tools, parallel_tool_calls=False)

    async def _async_init(self):
        self.checkpointer_cm = AsyncPostgresSaver.from_conn_string(self.db_uri)
            
        def react(state: self.State):
            last_plan = state["messages"][-1].content
            executor_instructions = f"""
        You are a highly capable task execution assistant. Your goal is to convert a previously approved plan into tool calls.
        You have access to the following tools and their descriptions:

        {self.tools_description}

        Plan to Execute:
        {last_plan}

        Instructions:
        1. Convert each step of the plan into the appropriate tool calls.
        2. Only generate tool calls (do NOT explain the plan again).
        3. Once all required values are computed, STOP calling tools.
        4. Output the FINAL ANSWER as plain text (no tool calls).
        """
            return {"messages": [self.llm_with_tools.invoke([SystemMessage(content=executor_instructions)] + state["messages"])]}

        # Compiling
        builder = StateGraph(self.State)
        builder.add_node("react", react)
        builder.add_node("tools", ToolNode(self.tools))
        builder.add_conditional_edges(
            "react", tools_condition
        )
        builder.add_edge(START, "react")
        builder.add_edge("tools", "react")
        self.builder = builder

    async def run(self, task: str, thread_id: str):
        thread = {"configurable": {"thread_id": thread_id}}
        async with self.checkpointer_cm as checkpointer:
            await checkpointer.setup()
            graph = self.builder.compile(checkpointer=checkpointer)
            results = await asyncio.to_thread(graph.invoke, {"task": task}, thread)
        return results