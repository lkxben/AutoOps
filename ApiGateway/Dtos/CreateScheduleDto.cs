namespace ApiGateway.Dtos;

public record CreateScheduleDto(
    string TaskId, 
    string CronEx,
    string Timezone
);