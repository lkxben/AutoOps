from app.services.telegram_service import send_telegram_message
import logging

logger = logging.getLogger(__name__)

async def handle_tool_call(payload):
    context = payload.get("context")
    channel = payload.get("channel")
    message = payload.get("message")

    logger.info(f"[Notif worker] Received notif call for channel {channel} with message {message} and context {context}")

    if channel.lower() == "telegram":
        await send_telegram_message(message, context)