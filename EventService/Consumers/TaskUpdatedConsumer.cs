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
        private readonly IConnection _connection;
        private readonly IModel _channel;
        private readonly string _queueName = "task-updates";

        public TaskUpdatedConsumer(IHubContext<TaskHub> hub)
        {
            _hub = hub;

            var factory = new ConnectionFactory
            {
                Uri = new Uri("amqp://guest:guest@localhost:6000")
            };
            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();

            _channel.QueueDeclare(
                queue: _queueName,
                durable: true,
                exclusive: false,
                autoDelete: false
            );
        }

        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var consumer = new EventingBasicConsumer(_channel);
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
                        .SendAsync("taskUpdated", dto);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[RabbitMQ] Failed: {ex.Message}");
                }
            };

            _channel.BasicConsume(queue: _queueName, autoAck: true, consumer: consumer);

            return Task.CompletedTask;
        }

        public override void Dispose()
        {
            _channel?.Close();
            _connection?.Close();
            base.Dispose();
        }
    }
}