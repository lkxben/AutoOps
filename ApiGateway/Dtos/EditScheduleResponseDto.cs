namespace ApiGateway.Dtos;
using SchedulerService.Protos;

public record EditScheduleResponseDto(
    string Id,
    ScheduleStatus Status,
    string CronEx,
    string Timezone,
    DateTime NextRunAt
);