using System.Text.Json.Serialization;

namespace Contracts.Workflow
{
    public record WorkflowTaskCreated(
        [property: JsonPropertyName("task_id")] Guid TaskId,
        [property: JsonPropertyName("user_id")] Guid UserId,
        [property: JsonPropertyName("prompt")] string Prompt
    );

    public record WorkflowPlanCreated(
        [property: JsonPropertyName("plan_id")] Guid PlanId,
        [property: JsonPropertyName("task_id")] Guid TaskId,
        [property: JsonPropertyName("user_id")] Guid UserId,
        [property: JsonPropertyName("prompt")] string Prompt,
        [property: JsonPropertyName("graph")] string Graph
    );
}