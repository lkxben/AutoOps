from app.services.telegram_service import send_telegram_message

async def handle_tool_call(payload):
    channel = payload.get("channel")
    message = payload.get("message")

    if channel == "telegram":
        await send_telegram_message(message)