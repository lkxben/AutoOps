import json
import aio_pika
from app.workers.plan_created_worker import handle_plan
from app.config import settings

async def start_plan_created_consumer():
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    channel = await connection.channel()

    exchange = await channel.declare_exchange(
        settings.PLAN_CREATED_EXCHANGE,
        aio_pika.ExchangeType.FANOUT,
        durable=True
    )

    await channel.declare_queue(
        settings.PLAN_CREATED_QUEUE + "_dlq",
        durable=True
    )

    queue = await channel.declare_queue(
        settings.PLAN_CREATED_QUEUE,
        durable=True,
        passive=False,
        arguments={
            "x-dead-letter-exchange": settings.PLAN_CREATED_QUEUE + "_dlq",
            "x-message-ttl": 60000
        }
    )

    await channel.set_qos(prefetch_count=10)
    await queue.bind(exchange)

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                payload = json.loads(message.body)
                await handle_plan(payload)