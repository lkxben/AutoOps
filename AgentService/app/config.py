from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:6000"
    WORKFLOW_QUEUE: str = "workflow-task-queue"
    WORKFLOW_EXCHANGE: str = "Contracts.Workflow:WorkflowTaskCreated"
    REACT_QUEUE: str = "react-queue"
    REACT_EXCHANGE: str = "react-task"
    AGENT_DB: str = "host=localhost port=6502 dbname=AutoOpsAgent user=postgres password=password"

settings = Settings()