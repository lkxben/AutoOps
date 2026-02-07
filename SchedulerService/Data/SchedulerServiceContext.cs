using System.Text;
using Microsoft.EntityFrameworkCore;
using SchedulerService.Entities;

namespace SchedulerService.Data
{
    public class SchedulerServiceContext : DbContext
    {
        private readonly string _schema;

        public SchedulerServiceContext(DbContextOptions<SchedulerServiceContext> options, IConfiguration configuration)
            : base(options)
        {
            _schema = configuration["DatabaseSchema"] ?? "scheduler";
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            builder.HasDefaultSchema(_schema);
        }

        public DbSet<Schedules> Schedule { get; set; } = default!;
    }
}