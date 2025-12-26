from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:6000"
    WORKFLOW_QUEUE: str = "workflow-task-queue"
    WORKFLOW_EXCHANGE: str = "Contracts.Workflow:WorkflowTaskCreated"
    AGENT_QUEUE: str = "agent-queue"
    AGENT_EXCHANGE: str = "agent-task"
    TOOL_QUEUE: str = "tool-call-queue"
    TOOL_EXCHANGE: str = "tool-call"

settings = Settings()