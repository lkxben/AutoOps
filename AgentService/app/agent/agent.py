import json
from langgraph.graph import StateGraph, START, END, MessagesState
from langchain_groq import ChatGroq
from typing import TypedDict, Annotated, Optional
from langchain_core.messages import AIMessage, AnyMessage, SystemMessage, HumanMessage
from langgraph.graph.message import add_messages
from langgraph.prebuilt import tools_condition, ToolNode
from langgraph.checkpoint.memory import MemorySaver
from app.agent.agent_tools import add, subtract, multiply, divide


class Agent:
    def __init__(self):
        class MainState(MessagesState):
            human_feedback: str
        self.MainState = MainState

        self.tools = [multiply, divide, add, subtract]
        self.tools_description = "\n".join(f"{t.__name__}: {t.__doc__}" for t in self.tools)

        self.llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.3,
            max_tokens=100
        )

        self.llm_with_tools = self.llm.bind_tools(self.tools, parallel_tool_calls=False)

        def human_feedback_node(state: MainState):
            pass

        def create_plan(state: MainState):
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

        def should_continue(state: MainState):
            human_feedback=state.get('human_feedback', None)
            if human_feedback is not None and human_feedback.strip() != "":
                return "planner"
            return "execute"

        def executor(state: MainState):
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
        memory = MemorySaver()
        builder = StateGraph(MainState)
        builder.add_node("planner", create_plan)
        builder.add_node("feedback", human_feedback_node)
        builder.add_node("execute", executor)
        builder.add_node("tools", ToolNode(self.tools))

        builder.add_edge(START, "planner")
        builder.add_edge("planner", "feedback")
        builder.add_conditional_edges(
            "feedback",
            should_continue,
            ["execute", "planner"]
        )
        builder.add_conditional_edges(
            "execute", tools_condition
        )
        builder.add_edge("tools", "execute")
        self.graph = builder.compile(checkpointer=memory) # add interrupt before

    def run(self, task: str, thread_id: str):
        msg = HumanMessage(content=task)
        thread = {"configurable": {"thread_id": thread_id}}
        results = self.graph.invoke({"messages": [msg]}, thread)
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