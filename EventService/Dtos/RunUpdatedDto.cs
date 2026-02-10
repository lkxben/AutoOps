using System.Text.Json.Serialization;

namespace EventService.Dtos
{
    public record RunUpdatedDto(
        [property: JsonPropertyName("runId")]
        string RunId,

        [property: JsonPropertyName("userId")]
        string UserId,

        [property: JsonPropertyName("taskId")]
        string TaskId,

        [property: JsonPropertyName("status")]
        int Status,

        [property: JsonPropertyName("description")]
        string Description
    );
}