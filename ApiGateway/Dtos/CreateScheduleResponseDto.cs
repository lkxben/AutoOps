namespace ApiGateway.Dtos;

public record class CreateScheduleResponseDto(
    string Id,
    DateTime NextRunAt
);