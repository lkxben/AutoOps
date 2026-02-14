using System.ComponentModel.DataAnnotations;

namespace ApiGateway.Dtos;

public record class CreateWorkflowTaskDto
{
    [Required]
    public string Title { get; init; } = default!;

    [Required]
    public string Prompt { get; init; } = default!;
}