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
from app.agent.agent_helper import publish_plan_draft, complete_minimal_plan, tool_registry
import logging

logger = logging.getLogger(__name__)

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
            previous_plan: Optional[str] = None
            task: Optional[str] = None
            validation_error: Optional[str] = None
            attempt: int = 0

        self.State = State
        self.db_uri = db_uri

        self.tool_descriptions = "\n".join(
            f"{name}({', '.join(info['inputs'])}): {info['description']}"
            for name, info in tool_registry.items()
        )

        self.planner_llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.4,
            max_tokens=200
        )

        self.validator_llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.0,
            max_tokens=100
        )

    async def _async_init(self):
        def validate_plan(state: self.State):
            validator_prompt = f"""
You are an execution-graph validator. Your job is to check whether the proposed PLAN can achieve the USER TASK.

Focus only on **whether the steps and dependencies can accomplish the task**. Do not output reasoning or repeat instructions—return only:

- VALID
or
- INVALID
    <one short reason, including the step IDs of any extra or unnecessary nodes>

Validation rules:
- Each node represents exactly one tool call.
- Every node referenced by an edge must exist.
- Only AVAILABLE TOOLS are used with correct inputs.
- Do not compute results; only use symbolic $<step_id> references.
- Identify any extra/unneeded steps beyond what is necessary to accomplish the USER TASK.
- Ignore duplicate or non-sequential step IDs.
- Ignore formatting issues like nodes before edges.

PLAN FORMAT EXAMPLE:
1|multiply|a=6,b=7|Multiply 6 and 7
2|add|a=5,b=$1|Add 5 to the result of step 1
1->2

AVAILABLE TOOLS:
{self.tool_descriptions}

USER TASK:
{state["task"]}

PLAN:
{state["previous_plan"]}
"""

            ai_msg = self.validator_llm.invoke([SystemMessage(content=validator_prompt)])
            verdict = ai_msg.content.strip()
            logger.info(f"Validator verdict: {verdict}")

            return {
                "validation_error": None if verdict.startswith("VALID") else verdict,
                "messages": [
                    AIMessage(content=f"Validator feedback:\n{verdict}")
                ],
                "previous_plan": state["previous_plan"],
                "attempt": state["attempt"],
            }

        def create_plan(state: self.State):
            feedback_block = ""
            if state["validation_error"]:
                feedback_block = f"""
PREVIOUS PLAN: 
{state["previous_plan"]}

PREVIOUS PLAN WAS INVALID:
{state["validation_error"]}

You MUST produce a valid, minimal plan using ONLY the AVAILABLE TOOLS.
Do NOT add steps unrelated to the USER TASK.
Do NOT search for “fixing” anything outside the available tools.
        """

            new_sys_msg = f"""
You are a planning agent.

Your goal is to produce a **minimal execution graph** that completes the USER TASK using only the AVAILABLE TOOLS.
Ignore all tools that are not needed for this task. Simplicity and correctness are more important than using all available tools.

If there is previous validation feedback, **remove extra/unnecessary steps**; do not just repeat them.

{feedback_block}

GUIDELINES:
1. Use **only the tools strictly necessary** to accomplish the USER TASK.
2. Each tool call must correspond to **exactly one node**.
3. Produce **minimal steps**; avoid duplication or unnecessary computation.
4. Step IDs must be **unique**. Gaps are allowed. Order of IDs does not matter.
5. List **all nodes first**, then all edges.
6. Node format: step_id|tool|arg1=val,arg2=val|short description
7. Edge format: from->to, connecting nodes that depend on each other.
8. Do **not compute results**; use symbolic $<step_id> references.
9. Avoid filler, extra searches, or unrelated tool calls.
10. Plain text only. No JSON, no markdown, no commentary.

EXAMPLE USER TASK: 5 + 6 * 7
EXAMPLE PLAN:
1|multiply|a=6,b=7|Multiply 6 and 7
2|add|a=5,b=$1|Add 5 to the result of step 1
1->2

AVAILABLE TOOLS:
{self.tool_descriptions}

USER TASK:
{state["task"]}
"""

            try:
                ai_msg = self.planner_llm.invoke([SystemMessage(content=new_sys_msg)])
            except Exception as e:
                logger.exception("Planner LLM failed")
                raise

            completed_plan = complete_minimal_plan(ai_msg.content)

            return {
                "previous_plan": completed_plan,
                "validation_error": None,
                "messages": [AIMessage(content=completed_plan)],
                "attempt": state["attempt"] + 1
            }
        
        def validation_decision(state: self.State):
            if state["validation_error"] and state["attempt"] < 3:
                return "planner"
            return END

        # Compiling
        builder = StateGraph(self.State)
        builder.add_node("planner", create_plan)
        builder.add_node("validator", validate_plan)

        builder.add_edge(START, "planner")
        builder.add_edge("planner", "validator")
        builder.add_conditional_edges(
            "validator",
            validation_decision,
            ["planner", END]
        )
        self.builder = builder

    async def run(self, thread_id: str, user_id: str, task: str):
        thread = {"configurable": {"thread_id": thread_id}}
        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            graph = self.builder.compile(checkpointer=checkpointer)
            state = self.State(
                task=task,
                previous_plan=None,
                validation_error=None,
                attempt=0
            )
            try:
                results = await asyncio.to_thread(graph.invoke, state, thread)
            except Exception as e:
                logger.exception("Error invoking graph")
            asyncio.create_task(publish_plan_draft(thread_id, user_id, results["previous_plan"]))
        return results