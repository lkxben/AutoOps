using System.Text.Json.Serialization;

namespace Contracts.Workflow
{
    public record WorkflowTaskCreated(
        [property: JsonPropertyName("task_id")] Guid TaskId,
        [property: JsonPropertyName("user_id")] Guid UserId,
        [property: JsonPropertyName("prompt")] string Prompt
    );

    public record RunCreated(
        [property: JsonPropertyName("run_id")] Guid RunId,
        [property: JsonPropertyName("task_id")] Guid TaskId,
        [property: JsonPropertyName("user_id")] Guid UserId,
        [property: JsonPropertyName("plan_id")] Guid PlanId,
        [property: JsonPropertyName("prompt")] string Prompt,
        [property: JsonPropertyName("title")] string Title,
        [property: JsonPropertyName("graph")] string Graph
    );
}