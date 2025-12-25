namespace WorkflowService.Entities
{
    public class WorkflowTask
    {
        public required string Id { get; set; }
        public required string InputData { get; set; }
        public TaskStatus Status { get; set; } = TaskStatus.Pending;
        public string? Results { get; set; }
    }

    public enum TaskStatus
    {
        Pending = 0,
        InProgress = 1,
        Completed = 2,
        Failed = 3
    }
}