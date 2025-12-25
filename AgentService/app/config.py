from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:6000"
    TASK_QUEUE: str = "workflow.tasks"

settings = Settings()