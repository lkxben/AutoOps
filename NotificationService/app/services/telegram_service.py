import aiohttp
from app.config import settings
from app.db import get_pool
import logging

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN

async def send_telegram_message(result: str, context: dict):
    task = context.get("task")
    run_id = context.get("run_id")
    user_id = task.get("user_id")
    title = task.get("title")

    if not user_id:
        logger.warning("No user_id found in context, skipping Telegram message")
        return

    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT address FROM user_notification_channels WHERE user_id=$1 AND channel='telegram'",
        user_id
    )

    if not row:
        logger.info(f"No Telegram channel configured for user {user_id}")
        return

    chat_id = row["address"]

    text = (
        f"Notification for Run {run_id} of Task\n\n"
        f"Title: {title}\n"
        f"\n{result}"
    )

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    async with aiohttp.ClientSession() as session:
        async with session.post(
            url,
            json={
                "chat_id": chat_id,
                "text": text,
            }
        ) as resp:
            if resp.status != 200:
                try:
                    body = await resp.text()
                except Exception:
                    body = "<could not read response body>"
                logger.error(f"Failed to send Telegram message: {resp.status} {body}")
            else:
                logger.info(f"Telegram message sent to user {user_id} for task '{title}'")