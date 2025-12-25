using Microsoft.AspNetCore.Identity;

namespace AuthService.Entities
{
    public class User : IdentityUser<Guid>
    {
        public required string Name { get; set; }
    }
}