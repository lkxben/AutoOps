from app.services.telegram_service import send_telegram_message
import logging

logger = logging.getLogger(__name__)

async def handle_tool_call(payload):
    user_id = payload.get("user_id")
    channel = payload.get("channel")
    message = payload.get("message")

    logger.info(f"[Notif worker] Received notif call for channel {channel} with message {message}")

    if channel == "telegram":
        await send_telegram_message(user_id, message)