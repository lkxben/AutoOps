using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using EventService.Dtos;
using Microsoft.AspNetCore.SignalR;
using EventService.Hubs;

namespace EventService.Consumers
{
    public class TaskUpdatedConsumer : BackgroundService
    {
        private readonly IHubContext<TaskHub> _hub;
        private const string ExchangeName = "task-updates";
        private const string QueueName = "task-updates-consumer";

        public TaskUpdatedConsumer(IHubContext<TaskHub> hub)
        {
            _hub = hub;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var factory = new ConnectionFactory
            {
                Uri = new Uri("amqp://guest:guest@localhost:6000")
            };

            using var connection = factory.CreateConnection();
            using var channel = connection.CreateModel();

            channel.ExchangeDeclare(
                exchange: ExchangeName,
                type: ExchangeType.Fanout,
                durable: true
            );

            channel.QueueDeclare(
                queue: QueueName,
                durable: true,
                exclusive: false,
                autoDelete: false
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
                    var dto = JsonSerializer.Deserialize<TaskUpdatedDto>(json);

                    if (dto == null)
                        return;

                    await _hub.Clients
                        .User(dto.UserId)
                        .SendAsync("TaskUpdated", dto);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[RabbitMQ] Failed: {ex.Message}");
                }
            };

            channel.BasicConsume(
                queue: QueueName,
                autoAck: true,
                consumer: consumer
            );

            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
    }
}