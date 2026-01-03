using WorkflowService.Protos;

namespace WorkflowService.Entities
{
    public class WorkflowTask
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public required string Title { get; set; }
        public required string Prompt { get; set; }
        public WorkflowTaskStatus Status { get; set; } = WorkflowTaskStatus.Pending;
        public string? Result { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}