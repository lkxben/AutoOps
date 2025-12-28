import json
import aio_pika
from app.workers.plan_task_worker import handle_workflow_task
from app.config import settings

async def start_task_created_consumer():
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    channel = await connection.channel()

    exchange = await channel.declare_exchange(
        settings.WORKFLOW_EXCHANGE,
        aio_pika.ExchangeType.FANOUT,
        durable=True
    )

    queue = await channel.declare_queue(
        settings.WORKFLOW_QUEUE,
        durable=True,
        passive=False
    )

    await queue.bind(exchange)

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                payload = json.loads(message.body)
                await handle_workflow_task(payload) # change to asyncio.create_task + asyncio.Semaphore later