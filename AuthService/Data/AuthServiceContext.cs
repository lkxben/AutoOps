using AuthService.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Data
{
    public class AuthServiceContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
    {
        public AuthServiceContext(DbContextOptions<AuthServiceContext> options)
            : base(options)
        {
        }
    }
}