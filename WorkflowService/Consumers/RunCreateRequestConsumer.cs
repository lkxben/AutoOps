using MassTransit;
using Contracts.Scheduler;
using Contracts.Workflow;
using WorkflowService.Data;
using WorkflowService.Entities;
using Microsoft.EntityFrameworkCore;

namespace WorkflowService.Consumers
{
    public class RunCreateRequestConsumer : IConsumer<RunCreateRequest>
    {
        private readonly WorkflowServiceContext _db;
        private readonly IPublishEndpoint _publishEndpoint;

        public RunCreateRequestConsumer(WorkflowServiceContext db, IPublishEndpoint publishEndpoint) 
        {
            _db = db;
            _publishEndpoint = publishEndpoint;
        }

        public async Task Consume(ConsumeContext<RunCreateRequest> context)
        {
            var message = context.Message;

            var plan = await _db.WorkflowPlans.FirstOrDefaultAsync(p => p.TaskId == message.TaskId);
            var task = await _db.WorkflowTasks.FirstOrDefaultAsync(t => t.Id == message.TaskId);

            if (plan == null || task == null)
            {
                Console.WriteLine($"Plan or Task not found for TaskId {message.TaskId}");
                return;
            }

            var run = new Run
            {
                UserId = message.UserId,
                TaskId = message.TaskId,
                PlanId = plan.Id,
            };

            _db.Runs.Add(run);
            await _db.SaveChangesAsync();
            await _publishEndpoint.Publish(new RunCreated(run.Id, task.Id, run.UserId, plan.Id, task.Prompt, task.Title, plan.Graph));
            Console.WriteLine($"Workflow received RunCreateRequest for Task {message.TaskId}");
        }
    }
}