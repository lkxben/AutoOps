import aio_pika
import json
from app.config import settings

class AgentQueuePublisher:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.exchange = None

    async def connect(self):
        if self.connection:
            return

        self.connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        self.channel = await self.connection.channel()

        self.exchange = await self.channel.declare_exchange(
            settings.TOOL_RESULT_EXCHANGE,
            aio_pika.ExchangeType.FANOUT,
            durable=True
        )

    async def publish(self, payload: dict):
        if not self.exchange:
            await self.connect()

        message = aio_pika.Message(
            body=json.dumps(payload).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT
        )

        await self.exchange.publish(
            message,
            routing_key=""
        )