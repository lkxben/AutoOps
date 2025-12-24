namespace ApiGateway.Dtos;

public record class RegisterDto(
    string Username,
    string Name,
    string Password
);