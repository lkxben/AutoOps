from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:6000"

    NOTIF_CALL_EXCHANGE: str = "notif-call"
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

settings = Settings()