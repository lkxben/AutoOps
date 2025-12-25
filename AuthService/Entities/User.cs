using Microsoft.AspNetCore.Identity;

namespace AuthService.Entities
{
    public class User : IdentityUser<int>
    {
        public required string Name { get; set; }
    }
}