namespace AuthService.Dtos;

public record class LoginDto(
    string Username,
    string Password
);