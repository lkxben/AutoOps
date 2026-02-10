using System.Text;
using Microsoft.EntityFrameworkCore;
using WorkflowService.Entities;

namespace WorkflowService.Data
{
    public class WorkflowServiceContext : DbContext
    {
        private readonly string _schema;

        public WorkflowServiceContext(DbContextOptions<WorkflowServiceContext> options, IConfiguration configuration)
            : base(options)
        {
            _schema = configuration["DatabaseSchema"] ?? "workflow";
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            builder.HasDefaultSchema(_schema);
        }

        public DbSet<WorkflowTask> WorkflowTasks { get; set; } = default!;
        public DbSet<WorkflowPlan> WorkflowPlans { get; set; } = default;

        public DbSet<Run> Runs { get; set; } = default;
    }
}