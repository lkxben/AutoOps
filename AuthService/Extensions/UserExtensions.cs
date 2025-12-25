using AuthService.Entities;
using AuthService.Protos;

namespace AuthService.Extensions
{
    public static class UserExtensions
    {

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