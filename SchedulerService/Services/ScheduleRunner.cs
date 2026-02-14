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
            CrontabSchedule cron;
            TimeZoneInfo tz;

            try
            {
                cron = CrontabSchedule.Parse(schedule.CronEx);
            }
            catch
            {
                _logger.LogError("Invalid cron expression for Schedule {ScheduleId}: {CronEx}", schedule.Id, schedule.CronEx);
                continue;
            }

            try
            {
                tz = TZConvert.GetTimeZoneInfo(schedule.Timezone);
            }
            catch
            {
                _logger.LogError("Invalid timezone for Schedule {ScheduleId}: {Timezone}", schedule.Id, schedule.Timezone);
                continue;
            }

            var nowLocal = TimeZoneInfo.ConvertTime(now, tz);

            if (schedule.Id == Guid.Empty || schedule.TaskId == Guid.Empty || schedule.UserId == Guid.Empty)
            {
                _logger.LogError("Invalid IDs for Schedule {ScheduleId}", schedule.Id);
                continue;
            }

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
            var nextLocalBase = TimeZoneInfo.ConvertTime(schedule.NextRunAt, tz);
            var baseTime = nextLocalBase > nowLocal ? nextLocalBase : nowLocal;

            var nextLocal = cron.GetNextOccurrence(baseTime);
            var nextUtc = TimeZoneInfo.ConvertTimeToUtc(nextLocal, tz);

            schedule.NextRunAt = nextUtc;
        }

        await _db.SaveChangesAsync();
    }
}