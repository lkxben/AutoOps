import json
import aio_pika
from app.workers.react_task_worker import handle_react_task
from app.config import settings

async def start_react_consumer():
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    channel = await connection.channel()

    exchange = await channel.declare_exchange(
        settings.REACT_EXCHANGE,
        aio_pika.ExchangeType.FANOUT,
        durable=True
    )

    queue = await channel.declare_queue(
        settings.REACT_QUEUE,
        durable=True,
        passive=False
    )

    await queue.bind(exchange)

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                payload = json.loads(message.body)
                await handle_react_task(payload)