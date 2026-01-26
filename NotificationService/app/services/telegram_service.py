import aiohttp
from app.config import settings
from app.db import get_pool

TELEGRAM_BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN

async def send_telegram_message(user_id, text):
    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT address FROM user_notification_channels WHERE user_id=$1 AND channel='telegram'",
        user_id
    )

    if not row:
        return

    chat_id = row["address"]

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    async with aiohttp.ClientSession() as session:
        async with session.post(
            url,
            json={
                "chat_id": chat_id,
                "text": text
            }
        ):
            pass