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
from pydantic import BaseModel
from typing import Any, Dict

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
            
        self.State = State
        self.db_uri = db_uri

        class ReactOutputSchema(BaseModel):
            tool_type: Optional[str] = None
            inputs: Optional[Dict[str, Any]] = None
            final_answer: Optional[Any] = None

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
            last_plan = state["plan"]
            task = state["task"]
            executor_instructions = f"""
            You are a ReAct agent. Execute the approved plan step by step, using the available tools.

            Task to accomplish:
            {task}

            Plan to follow:
            {last_plan}

            Rules:
            1. Follow the plan **one tool call at a time**.
            2. You will receive the result of each tool call as "tool_result". Use it to inform the next step.
            3. Only output the final answer **after all steps are completed** and the task is fully accomplished.
            4. Each response must be exactly **one JSON object**:
            a) Tool call:
            {{
                "tool_type": "<tool_name>",
                "inputs": {{
                    "arg1": value1,
                    "arg2": value2
                }}
            }}
            b) Final answer (only if the task is complete):
            {{
                "final_answer": <value>
            }}
            5. Inputs must match tool parameters exactly and be JSON-serializable (numbers, strings, booleans, lists, dicts).
            6. Do NOT include explanations, commentary, or multiple steps in one response.

            Available tools:
            {self.tool_descriptions}
            """
            tool_call_result = self.llm.invoke([SystemMessage(content=executor_instructions)] + state["messages"])
            return {"messages": [AIMessage(content=tool_call_result.json())]}
        
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
        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            graph = self.builder.compile(checkpointer=checkpointer)
            results = await graph.ainvoke(
                None,
                updates={"messages": [
                    HumanMessage(content=json.dumps({
                        "role": "system",
                        "content": f"Tool call result received: {tool_result}. Use this to decide the next step."
                    }))
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