using Microsoft.EntityFrameworkCore;
using WorkflowService.Entities;

namespace WorkflowService.Data
{
    public class WorkflowServiceContext : DbContext
    {
        public WorkflowServiceContext(DbContextOptions<WorkflowServiceContext> options)
            : base(options)
        {
        }

        public DbSet<WorkflowTask> WorkflowTasks { get; set; } = default!;
    }
}