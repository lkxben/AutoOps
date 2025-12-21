using AuthService.Entities.User;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Data
{
    public class AuthServiceContext : IdentityDbContext<User, Role, int>
    {
        public AuthServiceContext(DbContextOptions<AuthServiceContext> options)
            : base(options)
        {
        }
    }
}