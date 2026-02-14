using System.ComponentModel.DataAnnotations;

namespace ApiGateway.Dtos;

public record LoginDto
{
    [Required]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Username must be at least 3 characters.")]
    public string Username { get; init; } = default!;

    [Required]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters.")]
    [RegularExpression(@"^(?=.*[!@#$%^&*(),.?""':{}|<>]).+$", ErrorMessage = "Password must contain at least one special character.")]
    public string Password { get; init; } = default!;
}