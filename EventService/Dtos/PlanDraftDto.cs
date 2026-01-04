using System.Text.Json.Serialization;
using System.Text.Json;

namespace EventService.Dtos
{
    public record PlanDraftDto(
        [property: JsonPropertyName("task_id")]
        string TaskId,

        [property: JsonPropertyName("user_id")]
        string UserId,

        [property: JsonPropertyName("graph")]
        JsonElement Graph
    );
}