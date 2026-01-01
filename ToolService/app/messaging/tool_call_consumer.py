import json
import asyncio
import aio_pika
from app.workers.tool_call_worker import handle_tool_call
from app.config import settings

MAX_CONCURRENT_TASKS = 10
semaphore = asyncio.Semaphore(MAX_CONCURRENT_TASKS)

async def _process_message(payload: dict):
    async with semaphore:
        handle_tool_call(payload)

async def start_tool_call_consumer():
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    channel = await connection.channel()

    exchange = await channel.declare_exchange(
        settings.TOOL_CALL_EXCHANGE,
        aio_pika.ExchangeType.FANOUT,
        durable=True
    )

    queue = await channel.declare_queue(
        settings.TOOL_CALL_QUEUE,
        durable=True,
        passive=False
    )

    await queue.bind(exchange)

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                payload = json.loads(message.body)
                asyncio.create_task(_process_message(payload))