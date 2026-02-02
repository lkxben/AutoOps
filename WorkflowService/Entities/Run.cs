using WorkflowService.Protos;

namespace WorkflowService.Entities
{
    public class WorkflowTask
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public Guid TaskId { get; set; }
        public Guid PlanId { get; set; }
        public RunStatus Status { get; set; } = RunStatus.Pending;
        public string? Result { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}