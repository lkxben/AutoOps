using AuthService.Dtos;
using AuthService.Entities.User;

namespace AuthService.Extensions;

public static class UserExtensions
{
    public static UserDto ToDto(this User user) =>
        new UserDto(user.Id, user.UserName!, user.Name);
}