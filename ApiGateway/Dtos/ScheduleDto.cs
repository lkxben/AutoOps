namespace ApiGateway.Dtos;
using SchedulerService.Protos;

public record ScheduleDto(
    string Id,
    string TaskId,
    ScheduleStatus Status,
    string CronEx,
    string Timezone,
    DateTime NextRunAt
);