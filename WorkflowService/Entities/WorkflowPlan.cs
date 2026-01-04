using WorkflowService.Protos;

namespace WorkflowService.Entities
{
    public class WorkflowPlan
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }

        public Guid TaskId { get; set; }

        public string Graph { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}