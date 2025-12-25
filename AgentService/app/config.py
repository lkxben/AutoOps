from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:6000"
    TASK_QUEUE: str = "workflow-task-created"
    TASK_EXCHANGE: str = "Contracts.Workflow:WorkflowTaskCreated"

settings = Settings()