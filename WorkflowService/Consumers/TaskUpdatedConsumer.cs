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
    public class TaskUpdatedConsumer : BackgroundService
    {
        private const string ExchangeName = "task-updates";
        private const string QueueName = "workflow.task-updates.queue";
        private const string DlqExchangeName = "workflow.task-updates.dlx";
        private const string DlqQueueName = "workflow.task-updates.dlq";
        private readonly IServiceScopeFactory _scopeFactory;

        public TaskUpdatedConsumer(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var factory = new ConnectionFactory
            {
                Uri = new Uri("amqp://guest:guest@localhost:6000")
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
                    var dto = JsonSerializer.Deserialize<TaskUpdatedDto>(json);

                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<WorkflowServiceContext>();

                    var taskId = Guid.Parse(dto.TaskId);
                    var task = await db.WorkflowTasks
                        .FirstOrDefaultAsync(t => t.Id == taskId);

                    if (task == null)
                        throw new Exception("Task not found");

                    if (!Enum.IsDefined(typeof(WorkflowTaskStatus), dto.Status))
                    {
                        throw new InvalidOperationException($"Invalid task status: {dto.Status}");
                    }

                    var newStatus = (WorkflowTaskStatus)dto.Status;

                    if (newStatus > task.Status)
                    {
                        task.Status = newStatus;
                        if (task.Status == WorkflowTaskStatus.Completed)
                        {
                            task.Result = dto.Description;
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