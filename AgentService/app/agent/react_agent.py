import json
import re
import asyncio
from langgraph.graph import StateGraph, START, END, MessagesState
from langchain_groq import ChatGroq
from typing import TypedDict, Annotated, Optional, List, Any
from langchain_core.messages import AIMessage, AnyMessage, SystemMessage, HumanMessage, ToolMessage
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
            results_array: List[Any] = [None]
            current_step: int = 1
            total_steps: int
            thoughts: str = ""
            
        self.State = State
        self.db_uri = db_uri

        class ReactOutputSchema(BaseModel):
            tool_type: str = None
            inputs: Dict[str, Any] = None
            thoughts: Optional[str] = None
            
        class FinalAnswerSchema(BaseModel):
            answer: str
            thoughts: str
        
        self.ReactOutputSchema = ReactOutputSchema
        self.FinalAnswerSchema = FinalAnswerSchema

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

        self.react_llm = self.llm.with_structured_output(ReactOutputSchema)
        self.final_llm = self.llm.with_structured_output(FinalAnswerSchema)

    async def _async_init(self):
        def react(state: self.State):
            plan = state["plan"]
            task = state["task"]
            current_step = state["current_step"]
            current_step_text = self.get_current_step_text(plan, state["current_step"])
            sys_msg = SystemMessage(content=f"""
You are an execution agent responsible for carrying out a pre-approved plan.

Task:
{task}

Plan:
{plan}

You are currently executing **one step at a time**.

Rules:
1. Do NOT modify, reorder, or reinterpret the plan.
2. Execute ONLY the current step.
3. Do NOT infer or compute future steps.
4. Do NOT provide a final answer until all steps are completed.
5. Output exactly **ONE JSON object** per step.
6. Each step requires exactly **one tool call**, follow the order given. Output:
{{
    "tool_type": "<tool_name>",
    "inputs": {{
        "arg1": value1,
        "arg2": value2
    }},
    "thoughts": "optional reasoning or notes"
}}
7. If you have no thoughts, omit the "thoughts" field entirely.

You are currently executing:
Step {current_step}: {current_step_text}

Results so far: {state["results_array"]}  # index corresponds to step numbers; initialize with None at index 0

Available tools:
{self.tool_descriptions}
""")

            tool_call_result = self.react_llm.invoke([sys_msg])

            return {"messages": [sys_msg, AIMessage(content=tool_call_result.json())]}
        
        def dummy_node(state: self.State):
            return state
        
        def final_answer(state: self.State):
            summary_prompt = f"""
You have completed all steps of the task.

Task:
{state['task']}

Plan:
{state['plan']}

Results from each step:
{state['results_array']}

Provide the final answer to the user. Include thought process under "thoughts" field.
"""
            result = self.final_llm.invoke([
                SystemMessage(content=summary_prompt)
            ])

            print(f"FINAL THOUGHTS: {result.thoughts}")

            return {"messages": [AIMessage(content=result.answer)]}

        def should_end(state):
            current_step = state["current_step"]
            total_steps = state["total_steps"]

            if current_step > total_steps:
                return "final"
            return "tools"
                
        # Compiling
        builder = StateGraph(self.State)
        builder.add_node("react", react)
        builder.add_node("tools", dummy_node)
        builder.add_node("final", final_answer)

        builder.add_conditional_edges(
            "react", should_end, ["final", "tools"]
        )
        builder.add_edge(START, "react")
        builder.add_edge("tools", "react")
        builder.add_edge("final", END)
        self.builder = builder

    async def start_task(self, thread_id: str, task: str, plan: str):
        thread = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}
        initial_state = {
            "task": task,
            "plan": plan,
            "current_step": 1,
            "total_steps": self.get_total_steps(plan),
            "results_array": [None],
            "thoughts": ""
        }
        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            graph = self.builder.compile(interrupt_before=["tools"], checkpointer=checkpointer)
            results = await graph.ainvoke(initial_state, thread)
        
        last_msg = results["messages"][-1].content.strip()
        try:
            tool_call_data = json.loads(last_msg)
        except json.JSONDecodeError:
            return results
        
        asyncio.create_task(tool_call(thread_id, tool_call_data["tool_type"], **tool_call_data["inputs"]))
        return results

    async def continue_task(self, thread_id: str, tool_result: dict):
        thread = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}

        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            checkpoint = await checkpointer.aget(thread)
            state = dict(checkpoint["channel_values"])
            current_step = state["current_step"] + 1
            new_results = list(state["results_array"])
            new_results.append(tool_result)

            if current_step > state["total_steps"]:
                graph = self.builder.compile(checkpointer=checkpointer)
                await graph.aupdate_state(
                    thread,
                    {"current_step": current_step, "results_array": new_results}
                )
                results = await graph.ainvoke(None, config=thread)
                return results
            
            else:
                graph = self.builder.compile(interrupt_after=["react"], checkpointer=checkpointer)

                await graph.aupdate_state(
                    thread,
                    {"current_step": current_step, "results_array": new_results}
                )
                results = await graph.ainvoke(None, config=thread)
            
                last_msg = results["messages"][-1].content.strip()
                try:
                    tool_call_data = json.loads(last_msg)
                except json.JSONDecodeError:
                    return
                
                asyncio.create_task(tool_call(thread_id, tool_call_data["tool_type"], **tool_call_data["inputs"]))
                return
    
    def get_current_step_text(self, plan: str, current_step: int) -> str:
        lines = plan.splitlines()
        for line in lines:
            line = line.strip()
            if not line:
                continue
            # Match lines starting with "1. ", "2. ", etc.
            if line.startswith(f"{current_step}."):
                # Remove the numbering
                return line[len(f"{current_step}."):].strip()
        return ""  # fallback if not found
    
    def get_total_steps(self, plan: str) -> int:
        # Match lines that start with a number followed by a dot
        step_pattern = re.compile(r'^\s*\d+\.\s+', re.MULTILINE)
        return len(step_pattern.findall(plan))