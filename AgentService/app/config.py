from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:6000"
    # with workflow service
    WORKFLOW_QUEUE: str = "workflow-task-queue"
    WORKFLOW_EXCHANGE: str = "Contracts.Workflow:WorkflowTaskCreated"
    PLAN_CREATED_QUEUE: str = "plan-created-queue"
    PLAN_CREATED_EXCHANGE: str = "Contracts.Workflow:WorkflowPlanCreated"

    # with tool service
    TOOL_CALL_EXCHANGE: str = "tool-call"
    TOOL_RESULT_QUEUE: str = "tool-result"
    TOOL_RESULT_EXCHANGE: str = "tool-result"

    # with event service
    TASK_UPDATED_EXCHANGE: str = "task-updates"
    PLAN_DRAFT_EXCHANGE: str = "plan-draft"
    AGENT_DB: str = "host=localhost port=6502 dbname=AutoOpsAgent user=postgres password=password"

settings = Settings()