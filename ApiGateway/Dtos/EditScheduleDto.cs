namespace ApiGateway.Dtos;
using SchedulerService.Protos;

public record EditScheduleDto(
    ScheduleStatus Status,
    string CronEx
);