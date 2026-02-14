using System.ComponentModel.DataAnnotations;
namespace ApiGateway.Dtos;

public record AddChannelDto
{
    [Required]
    public string Channel { get; init; } = default!;

    [Required]
    public string Address { get; init; } = default!;
}