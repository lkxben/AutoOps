using System.ComponentModel.DataAnnotations;
namespace ApiGateway.Dtos;

public record CreateRunDto
{
    [Required]
    public string TaskId { get; init; } = default!;
}