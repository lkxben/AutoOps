namespace AuthService.Dtos;

public record class RegisterDto(
    string Username,
    string Name,
    string Password
);