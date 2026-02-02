using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using EventService.Dtos;
using Microsoft.AspNetCore.SignalR;
using EventService.Hubs;

namespace EventService.Consumers
{
    public class RunUpdatedConsumer : BackgroundService
    {
        private readonly IHubContext<TaskHub> _hub;
        private readonly RabbitMQSettings _settings;
        private const string ExchangeName = "run-updates";
        private const string QueueName = "event.run-updates.queue";
        private const string DlqExchangeName = "event.run-updates.dlx";
        private const string DlqQueueName = "event.run-updates.dlq";

        public RunUpdatedConsumer(IHubContext<TaskHub> hub, RabbitMQSettings settings)
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
                    var dto = JsonSerializer.Deserialize<RunUpdatedDto>(json);

                    if (dto == null)
                        return;

                    await _hub.Clients
                        .User(dto.UserId)
                        .SendAsync("RunUpdated", dto);

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