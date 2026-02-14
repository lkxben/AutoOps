using System.ComponentModel.DataAnnotations;
namespace ApiGateway.Dtos;

public record CreateScheduleDto{
    [Required]
    public string TaskId { get; init; } = default!;

    [Required]
    public string CronEx { get; init; } = default!;
    
    [Required]
    public string Timezone { get; init; } = default!;
}