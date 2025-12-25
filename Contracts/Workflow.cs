namespace Contracts.Workflow
{
    public record WorkflowTaskCreated(Guid TaskId, string InputData);

    public record WorkflowTaskCompleted(Guid TaskId, string Results);
}