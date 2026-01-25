from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:6000"

    # with agent service
    TOOL_CALL_EXCHANGE: str = "tool-call"
    TOOL_RESULT_EXCHANGE: str = "tool-result"

    # with notif service
    NOTIF_CALL_EXCHANGE: str = "notif-call"

settings = Settings()