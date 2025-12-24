namespace ApiGateway.Dtos;

public record class UserDto(
    int Id,
    string Username,
    string Name
);