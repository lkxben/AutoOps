import json
import aio_pika
from app.workers.task_worker import handle_task
from app.config import settings

async def start_consumer():
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    channel = await connection.channel()

    queue = await channel.declare_queue(
        settings.TASK_QUEUE,
        durable=True,
        passive=False
    )

    await queue.bind(settings.TASK_EXCHANGE)

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                payload = json.loads(message.body)
                await handle_task(payload)