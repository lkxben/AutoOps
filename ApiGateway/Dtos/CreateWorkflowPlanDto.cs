using System.Text.Json;
using System.ComponentModel.DataAnnotations;

namespace ApiGateway.Dtos;

public record CreateWorkflowPlanDto
{
    [Required]
    public string TaskId { get; init; } = default!;
    
    [Required]
    public JsonElement Graph { get; init; } = default!;
}