using Microsoft.AspNetCore.Identity;

namespace AuthService.Entities.User
{
    public class User : IdentityUser<int>
    {
        public required string Name { get; set; }
    }
}