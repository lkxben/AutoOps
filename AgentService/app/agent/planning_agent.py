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
from app.agent.agent_helper import publish_plan, complete_plan

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
        def human_feedback_node(state: self.State):
            pass

        def create_plan(state: self.State):
            human_feedback = state.get('human_feedback', '')

            new_sys_msg = f"""
You are a planning agent.

Convert the user's task into a structured execution graph in a MINIMAL, compact format.

RULES:
1. Use plain text only. No JSON, no markdown, no commentary.
2. Node format: step_id|tool|arg1=val,arg2=val|short description
3. Edge format: from->to [optional: condition/loop]
4. Do not compute results; use symbolic arguments or $<step_id> references.
5. Step IDs must be sequential integers starting from 1.
6. Include all nodes first, then all edges.
7. For every node that uses the result of another node in its inputs, create an edge from that node to the dependent node.
8. Ensure every node is connected and no dependency edges are omitted.
9. Minimise unnecessary nodes or edges.

AVAILABLE TOOLS:
{self.tool_descriptions}

USER TASK:
{state["messages"][-1].content}
"""
            
            ai_msg = self.llm.invoke([SystemMessage(content=new_sys_msg)])
            plan_str = ai_msg.content
            completed_plan = complete_plan(plan_str)
            return {"messages": [AIMessage(content=completed_plan)]}

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

    async def run(self, thread_id: str, user_id: str, task: str):
        msg = HumanMessage(content=task)
        thread = {"configurable": {"thread_id": thread_id}}
        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            graph = self.builder.compile(checkpointer=checkpointer)
            results = await asyncio.to_thread(graph.invoke, {"messages": [msg]}, thread)
            asyncio.create_task(publish_plan(thread_id, user_id, results["messages"][-1].content))
        return results