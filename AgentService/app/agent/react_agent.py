import json
import asyncio
from langgraph.graph import StateGraph, START, END, MessagesState
from langchain_groq import ChatGroq
from typing import TypedDict, Annotated, Optional
from langchain_core.messages import AIMessage, AnyMessage, SystemMessage, HumanMessage
from langgraph.graph.message import add_messages
from langgraph.prebuilt import tools_condition, ToolNode
from langgraph.checkpoint.memory import MemorySaver
from app.agent.agent_tools import add, subtract, multiply, divide, tool_call
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

        self.llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.3,
            max_tokens=100
        )

    async def _async_init(self):
        self.checkpointer_cm = AsyncPostgresSaver.from_conn_string(self.db_uri)
            
        def react(state: self.State):
            last_plan = state["messages"][-1].content
            executor_instructions = f"""
            You are a highly capable ReAct agent (Reasoning + Acting). Your goal is to execute a previously approved plan step by step by calling tools.

            You have access to the following tools and their descriptions:

            {self.tool_descriptions}

            Plan to Execute:
            {last_plan}

            Instructions:
            1. Execute one step at a time by generating a single tool call per response.
            2. Each tool call must be output as **valid JSON**, following this format:

            {{
            "tool_type": "function_name",
            "inputs": {{
                "arg1": value1,
                "arg2": value2
            }}
            }}

            - The keys in `inputs` must match the tool input names.
            - Values must be JSON-serializable (numbers, strings, booleans, lists, dicts).
            - Only generate **one JSON object per response** for a single tool call.
            3. Wait for the result of the tool call before proceeding to the next step.
            4. Do NOT include any extra text, explanations, or commentary.
            5. Once all steps are completed, output the FINAL ANSWER as a separate JSON object:

            {{
            "final_answer": <value>
            }}

            Example:

            Step: "Multiply 5 by 2"

            {{
            "tool_type": "multiply",
            "inputs": {{
                "a": 5,
                "b": 2
            }}
            }}

            # Wait for result, then next step:

            {{
            "tool_type": "add",
            "inputs": {{
                "a": 10,
                "b": 3
            }}
            }}

            FINAL ANSWER:

            {{
            "final_answer": 13
            }}
            """
            return {"messages": [self.llm.invoke([SystemMessage(content=executor_instructions)] + state["messages"])]}
        
        def dummy_node(state: self.State):
            return state

        # Compiling
        builder = StateGraph(self.State)
        builder.add_node("react", react)
        builder.add_node("tools", dummy_node)
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
            graph = self.builder.compile(interrupt_before=["tools"], checkpointer=checkpointer)
            results = await asyncio.to_thread(graph.invoke, {"task": task}, thread)
        last_msg = results["messages"][-1].content.strip()
        try:
            tool_call_data = json.loads(last_msg)
        except json.JSONDecodeError:
            print("Invalid JSON from LLM:", last_msg)
            return results

        if "FINAL_ANSWER" in tool_call_data:
            return results
        
        asyncio.create_task(tool_call(thread_id, tool_call_data["tool_type"], **tool_call_data["inputs"]))
        return results