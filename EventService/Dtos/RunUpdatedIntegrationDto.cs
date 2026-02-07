using System.Text.Json.Serialization;

namespace EventService.Dtos
{
    public record RunUpdatedIntegrationDto(
        [property: JsonPropertyName("run_id")]
        string RunId,

        [property: JsonPropertyName("user_id")]
        string UserId,

        [property: JsonPropertyName("task_id")]
        string TaskId,

        [property: JsonPropertyName("status")]
        int Status,

        [property: JsonPropertyName("description")]
        string Description
    );
}