import json
import asyncio
from langgraph.graph import StateGraph, START, END, MessagesState
from langchain_groq import ChatGroq
from typing import TypedDict, Annotated, Optional
from langchain_core.messages import AIMessage, AnyMessage, SystemMessage, HumanMessage
from langgraph.graph.message import add_messages
from langgraph.prebuilt import tools_condition, ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

class PlanningAgent:
    _instance = None

    @classmethod
    async def get_instance(cls, db_uri: str):
        if cls._instance is None:
            cls._instance = PlanningAgent(db_uri)
            await cls._instance._async_init()
        return cls._instance
    
    def __init__(self, db_uri: str):
        class State(MessagesState):
            human_feedback: str
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

        def human_feedback_node(state: self.State):
            pass

        def create_plan(state: self.State):
            human_feedback = state.get('human_feedback', '')
            planner_instructions = f"""
You are a task planning assistant.

Your job is to produce a clear, human-readable step-by-step plan for solving the user's task.

IMPORTANT RULES:
1. DO NOT call tools.
2. DO NOT use JSON, function syntax, or code.
3. Each step must be written in natural language.
4. Each step must correspond to exactly ONE tool call later.
5. Steps must be strictly sequential — no parallel or combined actions.
6. Do NOT include explanations, reasoning, or commentary.

You MUST take into account the following human feedback (if any) when generating the plan:
{human_feedback}

Available tools:
{self.tool_descriptions}

User task:
{state['messages'][-1].content}

Return ONLY a numbered list.
"""
            return {"messages": [self.llm.invoke([SystemMessage(content=planner_instructions)])]}

        def should_continue(state: self.State):
            human_feedback=state.get('human_feedback', None)
            if human_feedback is not None and human_feedback.strip() != "":
                return "planner"
            return END

        # Compiling
        builder = StateGraph(self.State)
        builder.add_node("planner", create_plan)
        builder.add_node("feedback", human_feedback_node)

        builder.add_edge(START, "planner")
        builder.add_edge("planner", "feedback")
        builder.add_conditional_edges(
            "feedback",
            should_continue,
            [END, "planner"]
        )
        self.builder = builder

    async def run(self, task: str, thread_id: str):
        msg = HumanMessage(content=task)
        thread = {"configurable": {"thread_id": thread_id}}
        async with self.checkpointer_cm as checkpointer:
            await checkpointer.setup()
            graph = self.builder.compile(checkpointer=checkpointer)
            results = await asyncio.to_thread(graph.invoke, {"messages": [msg]}, thread)
        return results