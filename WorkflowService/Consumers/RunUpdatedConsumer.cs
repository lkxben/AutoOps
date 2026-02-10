using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using WorkflowService.Protos;
using WorkflowService.Dtos;
using WorkflowService.Data;
using Microsoft.EntityFrameworkCore;
using WorkflowService.Entities;

namespace WorkflowService.Consumers
{
    public class RunUpdatedConsumer : BackgroundService
    {
        private readonly RabbitMQSettings _settings;
        private const string ExchangeName = "run-updates";
        private const string QueueName = "workflow.run-updates.queue";
        private const string DlqExchangeName = "workflow.run-updates.dlx";
        private const string DlqQueueName = "workflow.run-updates.dlq";
        private readonly IServiceScopeFactory _scopeFactory;

        public RunUpdatedConsumer(IServiceScopeFactory scopeFactory, RabbitMQSettings settings)
        {
            _scopeFactory = scopeFactory;
            _settings = settings;
        }

        private bool IsValidTransition(RunStatus from, RunStatus to) =>
        (from, to) switch
        {
            (RunStatus.Pending, RunStatus.Running) => true,
            (RunStatus.Running, RunStatus.Completed) => true,
            (RunStatus.Running, RunStatus.Failed) => true,
            _ => false
        };

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

                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<WorkflowServiceContext>();

                    var runId = Guid.Parse(dto.RunId);
                    var run = await db.Runs
                        .FirstOrDefaultAsync(r => r.Id == runId);

                    if (run == null)
                        throw new Exception("Run not found");

                    if (!Enum.IsDefined(typeof(RunStatus), dto.Status))
                    {
                        throw new InvalidOperationException($"Invalid run status: {dto.Status}");
                    }

                    var newStatus = (RunStatus)dto.Status;
                    var timestampUnix = ea.BasicProperties?.Timestamp.UnixTime ?? 0;
                    var dt = timestampUnix != 0
                        ? DateTimeOffset.FromUnixTimeSeconds((long)timestampUnix).UtcDateTime
                        : DateTime.UtcNow;

                    if (IsValidTransition(run.Status, newStatus))
                    {
                        run.Status = newStatus;
                        if (run.Status == RunStatus.Completed)
                        {
                            run.Result = dto.Description;
                            run.UpdatedAt = dt;
                        }

                        await db.SaveChangesAsync();
                    }

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