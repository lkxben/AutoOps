namespace ApiGateway.Dtos;

using System.ComponentModel.DataAnnotations;
using SchedulerService.Protos;

public record EditScheduleDto
{
    [Required]
    public ScheduleStatus Status { get; init; } = default!;

    [Required]
    public string CronEx { get; init; } = default!;
}