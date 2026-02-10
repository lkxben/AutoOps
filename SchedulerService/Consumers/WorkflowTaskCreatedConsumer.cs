using MassTransit;
using SchedulerService.Protos;
using Contracts.Workflow;
using SchedulerService.Data;
using SchedulerService.Entities;

namespace SchedulerService.Consumers
{
    public class WorkflowTaskCreatedConsumer : IConsumer<WorkflowTaskCreated>
    {
        private readonly SchedulerServiceContext _db;

        public WorkflowTaskCreatedConsumer(SchedulerServiceContext db)
        {
            _db = db;
        }

        public async Task Consume(ConsumeContext<WorkflowTaskCreated> context)
        {
            var message = context.Message;

            var taskMapping = new TaskUserMapping
            {
                TaskId = message.TaskId,
                UserId = message.UserId
            };

            _db.TaskUserMappings.Add(taskMapping);
            await _db.SaveChangesAsync();

            Console.WriteLine($"Scheduler received WorkflowTaskCreated for Task {message.TaskId}");
        }
    }
}