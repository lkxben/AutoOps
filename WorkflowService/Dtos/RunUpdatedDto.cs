using System.Text.Json.Serialization;

namespace WorkflowService.Dtos
{
    public record RunUpdatedDto(
        [property: JsonPropertyName("run_id")]
        string RunId,

        [property: JsonPropertyName("user_id")]
        string UserId,

        [property: JsonPropertyName("status")]
        int Status,

        [property: JsonPropertyName("description")]
        string Description
    );
}