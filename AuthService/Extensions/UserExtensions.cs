using AuthService.Dtos;
using AuthService.Entities.User;
using AuthService.Proto;

namespace AuthService.Extensions
{
    public static class UserExtensions
    {
        public static UserDto ToDto(this User user) =>
            new UserDto(user.Id, user.UserName!, user.Name);

        public static UserModel ToModel(this User user)
        {
            return new UserModel
            {
                Id = user.Id, 
                Username = user.UserName!,
                Name = user.Name
            };
        }
    }
}