from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:6000"

    # with tool service
    TOOL_CALL_EXCHANGE: str = "tool-call"
    TOOL_CALL_QUEUE: str = "tool-call-queue"
    TOOL_RESULT_EXCHANGE: str = "tool-result"

settings = Settings()