import json
import asyncio
import aio_pika
from app.workers.tool_call_worker import handle_tool_call
from app.config import settings

async def start_tool_call_consumer():
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=100)

    EXCHANGE_NAME = settings.TOOL_CALL_EXCHANGE
    QUEUE_NAME = f"tool.{EXCHANGE_NAME}.queue"
    DLX_NAME = f"{QUEUE_NAME}.dlx"
    DLQ_NAME = f"{QUEUE_NAME}.dlq"

    exchange = await channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.FANOUT,
        durable=True
    )

    dlx = await channel.declare_exchange(
        DLX_NAME,
        aio_pika.ExchangeType.FANOUT,
        durable=True
    )

    dlq = await channel.declare_queue(
        DLQ_NAME,
        durable=True
    )

    await dlq.bind(dlx)

    queue = await channel.declare_queue(
        QUEUE_NAME,
        durable=True,
        passive=False,
        arguments={
            "x-dead-letter-exchange": DLX_NAME,
            "x-message-ttl": 60000
        }
    )

    await queue.bind(exchange)

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                payload = json.loads(message.body)
                await handle_tool_call(payload)