using Microsoft.EntityFrameworkCore;
using SchedulerService.Data;
using SchedulerService.Entities;
using MassTransit;
using Contracts.Scheduler;
using NCrontab;
using TimeZoneConverter;
using SchedulerService.Protos;

public class ScheduleRunner
{
    private readonly SchedulerServiceContext _db;
    private readonly IPublishEndpoint _publish;
    private readonly ILogger<ScheduleRunner> _logger;
    private readonly TimeSpan maxDelay = TimeSpan.FromMinutes(1);

    public ScheduleRunner(SchedulerServiceContext db, IPublishEndpoint publish, ILogger<ScheduleRunner> logger)
    {
        _db = db;
        _publish = publish;
        _logger = logger;
    }

    public async Task RunDueSchedules()
    {
        var now = DateTime.UtcNow;
        _logger.LogInformation("Running due schedules at {Time}", DateTime.UtcNow);

        var schedules = await _db.Schedules
            .Where(s =>
                s.Status == ScheduleStatus.Active &&
                s.NextRunAt != null &&
                s.NextRunAt <= now &&
                (s.LockedUntil == null || s.LockedUntil < now)
            )
            .Take(50)
            .ToListAsync();

        foreach (var schedule in schedules)
        {
            schedule.LockedUntil = now.AddSeconds(30);
        }

        await _db.SaveChangesAsync();

        foreach (var schedule in schedules)
        {
            var cron = CrontabSchedule.Parse(schedule.CronEx);
            var tz = TZConvert.GetTimeZoneInfo(schedule.Timezone);

            var nowLocal = TimeZoneInfo.ConvertTime(now, tz);

            var isTooLate = schedule.NextRunAt < now - maxDelay;

            if (!isTooLate)
            {
                await _publish.Publish(new RunCreateRequest(
                    schedule.UserId,
                    schedule.TaskId,
                    schedule.Id
                ));
            }
            else
            {
                _logger.LogWarning(
                    "Skipping missed run for Schedule {ScheduleId}, NextRunAt={NextRunAt}",
                    schedule.Id,
                    schedule.NextRunAt
                );
            }
            var baseTime = schedule.NextRunAt > now
                ? TimeZoneInfo.ConvertTime(schedule.NextRunAt, tz)
                : nowLocal;

            var nextLocal = cron.GetNextOccurrence(baseTime);
            var nextUtc = TimeZoneInfo.ConvertTimeToUtc(nextLocal, tz);

            schedule.NextRunAt = nextUtc;
        }

        await _db.SaveChangesAsync();
    }
}