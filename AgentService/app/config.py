from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:6000"
    WORKFLOW_QUEUE: str = "workflow-task-queue"
    WORKFLOW_EXCHANGE: str = "Contracts.Workflow:WorkflowTaskCreated"
    AGENT_QUEUE: str = "agent-queue"
    AGENT_EXCHANGE: str = "agent-task"
    TOOL_EXCHANGE: str = "tool-call"
    AGENT_DB: str = "host=localhost port=6502 dbname=AutoOpsAgent user=postgres password=password"

settings = Settings()