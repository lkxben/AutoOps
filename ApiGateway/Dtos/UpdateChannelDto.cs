using System.ComponentModel.DataAnnotations;

namespace ApiGateway.Dtos;

public record UpdateChannelDto 
{
    [Required]
    public string Address { get; init; } = default!;
}