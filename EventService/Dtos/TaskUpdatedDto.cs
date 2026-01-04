using System.Text.Json.Serialization;

namespace EventService.Dtos
{
    public record TaskUpdatedDto(
        [property: JsonPropertyName("task_id")]
        string TaskId,

        [property: JsonPropertyName("user_id")]
        string UserId,

        [property: JsonPropertyName("status")]
        int Status,

        [property: JsonPropertyName("description")]
        string Description
    );
}