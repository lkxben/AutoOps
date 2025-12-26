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

        def human_feedback_node(state: self.State):
            pass

        def create_plan(state: self.State):
            human_feedback = state.get('human_feedback', '')
            planner_instructions = f"""
        You are a highly capable task planning assistant. Your goal is to create a step-by-step plan for completing a given task. 
        You have access to the following tools and their descriptions:

        {self.tools_description}

        Instructions:
        1. Break the task into clear, actionable steps.
        2. Each step should be concise and focused on achieving a specific part of the task.
        3. Number your steps sequentially starting from 1.
        4. Take into account any human feedback: {human_feedback}. Update your plan accordingly.
        5. Do NOT generate tool calls yet — only create the numbered plan.
        6. Output format must be strictly numbered steps.

        Human Task: {state['messages'][-1].content}
        """
            return {"messages": [self.llm_with_tools.invoke([SystemMessage(content=planner_instructions)])]}

        def should_continue(state: self.State):
            human_feedback=state.get('human_feedback', None)
            if human_feedback is not None and human_feedback.strip() != "":
                return "planner"
            return END

        # Compiling
        builder = StateGraph(self.State)
        builder.add_node("planner", create_plan)
        builder.add_node("feedback", human_feedback_node)
        builder.add_node("tools", ToolNode(self.tools))

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

# png_bytes = graph.get_graph().draw_mermaid_png()

# with open("graph.png", "wb") as f:
#     f.write(png_bytes)

# thread = {"configurable": {"thread_id": "1"}}
# msg = HumanMessage(content="Give me the result of ((5 * 3) / ((9 - 3) * 3))")
# results = graph.invoke({"messages": [msg]}, thread)
# for m in results["messages"]:
#     m.pretty_print()

# while True:
#     further_feedback = input("Any feedback for the plan? (press Enter to continue) ")
#     graph.update_state(thread, {"human_feedback": further_feedback}, as_node="feedback")
#     results = graph.invoke(None, thread)
#     for m in results["messages"]:
#         m.pretty_print()
#     if further_feedback == "":
#         break