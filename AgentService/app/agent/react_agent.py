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
from app.agent.agent_helper import tool_call, publish_result, strip_reactflow_metadata, publish_error, publish_start
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from pydantic import BaseModel, ValidationError
from typing import Any, Dict
import logging

logger = logging.getLogger(__name__)

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
            completed_steps: {int, Any}
            previous_node: int
            execution_history: List[int]
            thoughts: str = ""
            final: bool = False
            terminal_nodes: List[int]
            
        self.State = State
        self.db_uri = db_uri

        class ReactOutputSchema(BaseModel):
            node: int = None
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
            temperature=0.0,
            max_tokens=100
        )

        self.react_llm = self.llm.with_structured_output(ReactOutputSchema)
        self.final_llm = self.llm.with_structured_output(FinalAnswerSchema)

    async def _async_init(self):
        def react(state: self.State):
            plan = state["plan"]
            task = state["task"]
            completed_steps = state["completed_steps"]
            execution_history = state["execution_history"]
            previous_node = state["previous_node"]
            sys_msg = SystemMessage(content=f"""
You are an execution agent responsible for carrying out a pre-approved plan.

Task:
{task}

Plan:
{plan}

State:
Completed steps with results: {completed_steps}
Execution history (order of nodes executed): {execution_history}
Previous node executed: {previous_node}

Rules:
1. Execute exactly one node at a time.
2. Do NOT modify, reorder, or reinterpret the plan.
3. Resolve all $<node> references in inputs using the results of completed steps.
4. Decide the next node to execute yourself based on completed steps, execution history, and plan dependencies.
5. Output EXACTLY ONE JSON object with:
   {{
       "node": <node_id>,
       "tool_type": "<tool_name>",
       "inputs": {{ ... resolved ... }},
       "thoughts": "optional reasoning or notes"
   }}
6. Output only JSON. No extra text, no comments, no explanations.
7. Use ONLY the tools listed below.

Available tools:
{self.tool_descriptions}
""")

            tool_call_result = self.invoke_with_retries(lambda: self.llm.invoke([sys_msg]), self.ReactOutputSchema)

            if not tool_call_result:
                return {"messages": [sys_msg], "previous_node": None}
            
            # print(f"REACT OUTPUT: {tool_call_result}")
            return {"messages": [sys_msg, AIMessage(content=tool_call_result.json())], "previous_node": tool_call_result.node}
        
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
{state['completed_steps']}


Provide the final answer to the user. Include brief thought process under "thoughts" field.
Output ONLY JSON conforming to the schema:
{{
  "answer": "<final answer>",
  "thoughts": "<reasoning, maximum 300 characters>"
}}
Do NOT include extra text. Make sure the JSON is valid and complete. 
If your reasoning is too long, summarise it so it fits within the limit.
"""
            result = self.invoke_with_retries(lambda: self.llm.invoke([summary_prompt]), self.FinalAnswerSchema)

            if not result:
                return {"messages": [summary_prompt], "previous_node": None}

            return {"messages": [AIMessage(content=result.answer)]}
        
        def should_end(state: self.State):
            if state["final"]:
                return "final"
            return "tools"
                
        # Compiling
        builder = StateGraph(self.State)
        builder.add_node("react", react)
        builder.add_node("tools", dummy_node)
        builder.add_node("final", final_answer)

        builder.add_edge(START, "react")
        builder.add_conditional_edges(
            "react", should_end, ["final", "tools"]
        )
        builder.add_edge("tools", "react")
        builder.add_edge("final", END)
        self.builder = builder

    async def start_task(self, thread_id: str, user_id: str, task: str, plan: str):
        thread = {"configurable": {"thread_id": thread_id}}

        stripped = strip_reactflow_metadata(plan)
        nodes = stripped["nodes"]
        edges = stripped["edges"]

        terminal_nodes = [int(edge["source"]) for edge in edges if edge["target"] == "END"]

        initial_state = {
            "task": task,
            "plan": stripped,
            "completed_steps": {},
            "previous_node": None,
            "execution_history": [],
            "thoughts": "",
            "terminal_nodes": terminal_nodes,
            "final": False
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
        
        asyncio.create_task(publish_start(thread_id, user_id))
        asyncio.create_task(tool_call(thread_id, user_id, tool_call_data["tool_type"], **tool_call_data["inputs"]))
        return results

    async def continue_task(self, thread_id: str, user_id: str, tool_result: dict):
        thread = {"configurable": {"thread_id": thread_id}}

        async with AsyncPostgresSaver.from_conn_string(self.db_uri) as checkpointer:
            await checkpointer.setup()
            checkpoint = await checkpointer.aget(thread)
            state = dict(checkpoint["channel_values"])
            completed_steps = dict(state.get("completed_steps", {}))
            previous_node = state["previous_node"] 
            completed_steps[previous_node] = tool_result
            execution_history = state.get("execution_history", [])
            execution_history.append(previous_node)

#             print(f"""CONTINUING:
# execution_history: {execution_history}
# previous_node: {previous_node}
# completed_steps: {completed_steps}
# terminal_nodes: {state["terminal_nodes"]}
#                   """)

            # calls final
            if any(n in execution_history for n in state["terminal_nodes"]):
                graph = self.builder.compile(checkpointer=checkpointer)
                await graph.aupdate_state(
                    thread,
                    {"completed_steps": completed_steps, "execution_history": execution_history, "final": True}
                )
                final_results = await graph.ainvoke(None, config=thread)

                if not final_results["previous_node"]:
                    asyncio.create_task(publish_error(thread_id, user_id))
                else:
                    asyncio.create_task(publish_result(thread_id, user_id, final_results["messages"][-1].content))
                return final_results
        
            # calls react
            else:
                graph = self.builder.compile(interrupt_after=["react"], checkpointer=checkpointer)

                await graph.aupdate_state(
                    thread,
                    {"completed_steps": completed_steps, "execution_history": execution_history}
                )
                results = await graph.ainvoke(None, config=thread)

                if not results["previous_node"]:
                    asyncio.create_task(publish_error(thread_id, user_id))
                    return
            
                last_msg = results["messages"][-1].content.strip()
                try:
                    tool_call_data = json.loads(last_msg)
                except json.JSONDecodeError:
                    logger.error("TOOL PARSING ERROR")
                    return
            
                asyncio.create_task(tool_call(thread_id, user_id, tool_call_data["tool_type"], **tool_call_data["inputs"]))
                return
            
    def invoke_with_retries(self, llm_call, schema, max_attempts: int = 3):
        for attempt in range(1, max_attempts + 1):
            ai_message = llm_call()
            result_str = ai_message.content
            try:
                result_json = json.loads(result_str)
                
                validated = schema(**result_json)
                return validated
            except (json.JSONDecodeError, ValidationError) as e:
                logger.info(f"Attempt {attempt} failed: {e}")
                if attempt == max_attempts:
                    logger.error("All retries failed")
                    return None