using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using EventService.Dtos;
using Microsoft.AspNetCore.SignalR;
using EventService.Hubs;

namespace EventService.Consumers
{
    public class PlanDraftConsumer : BackgroundService
    {
        private readonly IHubContext<TaskHub> _hub;
        private readonly RabbitMQSettings _settings;
        private const string ExchangeName = "plan-draft";
        private const string QueueName = "event.plan-draft.queue";
        private const string DlqExchangeName = "event.plan-draft.dlx";
        private const string DlqQueueName = "event.plan-draft.dlq";

        public PlanDraftConsumer(IHubContext<TaskHub> hub, RabbitMQSettings settings)
        {
            _hub = hub;
            _settings = settings;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var uri = $"amqp://{_settings.Username}:{_settings.Password}@{_settings.Host}:{_settings.Port}";

            var factory = new ConnectionFactory
            {
                Uri = new Uri(uri)
            };

            using var connection = factory.CreateConnection();
            using var channel = connection.CreateModel();
            channel.BasicQos(prefetchSize: 0, prefetchCount: 10, global: false);

            channel.ExchangeDeclare(
                exchange: ExchangeName,
                type: ExchangeType.Fanout,
                durable: true
            );

            channel.ExchangeDeclare(
                exchange: DlqExchangeName,
                type: ExchangeType.Fanout,
                durable: true
            );

            channel.QueueDeclare(
                queue: DlqQueueName,
                durable: true,
                exclusive: false,
                autoDelete: false
            );

            channel.QueueBind(
                queue: DlqQueueName,
                exchange: DlqExchangeName,
                routingKey: ""
            );

            var args = new Dictionary<string, object>
            {
                { "x-dead-letter-exchange", DlqExchangeName },
                { "x-message-ttl", 60000 }
            };

            channel.QueueDeclare(
                queue: QueueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: args
            );

            channel.QueueBind(
                queue: QueueName,
                exchange: ExchangeName,
                routingKey: ""
            );

            var consumer = new EventingBasicConsumer(channel);

            consumer.Received += async (_, ea) =>
            {
                try
                {
                    var json = Encoding.UTF8.GetString(ea.Body.ToArray());
                    var dto = JsonSerializer.Deserialize<PlanDraftDto>(json);

                    if (dto == null)
                        return;

                    await _hub.Clients
                        .User(dto.UserId)
                        .SendAsync("PlanDraft", dto);

                    channel.BasicAck(ea.DeliveryTag, multiple: false);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[RabbitMQ] Failed: {ex.Message}");
                    channel.BasicReject(ea.DeliveryTag, requeue: false);
                }
            };

            channel.BasicConsume(
                queue: QueueName,
                autoAck: false,
                consumer: consumer
            );

            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
    }
}