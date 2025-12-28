using WorkflowService.Protos;

namespace WorkflowService.Entities
{
    public class WorkflowTask
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public required string InputData { get; set; }
        public WorkflowTaskStatus Status { get; set; } = WorkflowTaskStatus.Pending;
        public string Results { get; set; } = "";
    }
}