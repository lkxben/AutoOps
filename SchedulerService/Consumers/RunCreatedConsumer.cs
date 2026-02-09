using MassTransit;
using SchedulerService.Protos;
using Contracts.Workflow;
using Contracts.Scheduler;
using SchedulerService.Data;
using SchedulerService.Entities;
using Microsoft.EntityFrameworkCore;

namespace SchedulerService.Consumers
{
    public class RunCreatedConsumer : IConsumer<RunCreated>
    {
        private readonly SchedulerServiceContext _db;
        private readonly IPublishEndpoint _publish;

        public RunCreatedConsumer(SchedulerServiceContext db, IPublishEndpoint publish)
        {
            _db = db;
            _publish = publish;
        }

        public async Task Consume(ConsumeContext<RunCreated> context)
        {
            var message = context.Message;
            if (message.ScheduleId == null)
                return;

            var schedule = await _db.Schedules
                .FirstOrDefaultAsync(s => s.Id == message.ScheduleId);

            if (schedule == null)
                return;

            schedule.LastRunAt = DateTime.UtcNow;
            schedule.LockedUntil = null;
            await _db.SaveChangesAsync();
            await _publish.Publish(new ScheduleUpdated(
                schedule.UserId,
                schedule.TaskId,
                schedule.Id,
                schedule.NextRunAt,
                schedule.LastRunAt.Value
            ));
            Console.WriteLine($"Schedule {schedule.Id} updated from RunCreated event");
        }
    }
}