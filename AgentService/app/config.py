from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:6000"
    # with workflow service
    TASK_CREATED_EXCHANGE: str = "Contracts.Workflow:WorkflowTaskCreated"
    RUN_CREATED_EXCHANGE: str = "Contracts.Workflow:RunCreated"

    # with tool service
    TOOL_CALL_EXCHANGE: str = "tool-call"
    TOOL_RESULT_EXCHANGE: str = "tool-result"

    # with event service
    RUN_UPDATED_EXCHANGE: str = "run-updates"
    PLAN_DRAFT_EXCHANGE: str = "plan-draft"
    AGENT_DB: str = "host=localhost port=6502 dbname=AutoOpsAgent user=postgres password=password"

    # with notif service
    NOTIF_CALL_EXCHANGE: str = "notif-call"

settings = Settings()