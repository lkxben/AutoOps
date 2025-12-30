namespace ApiGateway.Dtos;

public record class LoginResponseDto(
    string Token,
    UserDto User
);