using System.Text.Json.Serialization;

namespace Contracts.Event
{
    public record TaskUpdatedEvent(
        [property: JsonPropertyName("task_id")] string TaskId,
        [property: JsonPropertyName("user_id")] string UserId,
        [property: JsonPropertyName("status")] string Status,
        [property: JsonPropertyName("result")] string Result
    );
}