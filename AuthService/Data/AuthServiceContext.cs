using AuthService.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Data
{
    public class AuthServiceContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
    {
        private readonly string _schema;

        public AuthServiceContext(DbContextOptions<AuthServiceContext> options, IConfiguration configuration)
            : base(options)
        {
            _schema = configuration["DatabaseSchema"] ?? "auth";
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            builder.HasDefaultSchema(_schema);
        }
    }
}