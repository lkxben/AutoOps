using System.Text.Json.Serialization;

namespace Contracts.Workflow
{
    public record WorkflowTaskCreated(
        [property: JsonPropertyName("task_id")] Guid TaskId,
        [property: JsonPropertyName("user_id")] Guid UserId,
        [property: JsonPropertyName("input_data")] string InputData
    );

    public record WorkflowPlanCreated(
        [property: JsonPropertyName("plan_id")] Guid PlanId,
        [property: JsonPropertyName("task_id")] Guid TaskId,
        [property: JsonPropertyName("user_id")] Guid UserId,
        [property: JsonPropertyName("task_description")] string TaskDescription,
        [property: JsonPropertyName("plan")] string Plan
    );
}