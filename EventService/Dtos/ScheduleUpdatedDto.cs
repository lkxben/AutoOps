using System.Text.Json.Serialization;

namespace EventService.Dtos
{
    public record ScheduleUpdatedDto(
        [property: JsonPropertyName("userId")]
        string UserId,

        [property: JsonPropertyName("taskId")]
        string TaskId,

        [property: JsonPropertyName("scheduleId")]
        string ScheduleId,

        [property: JsonPropertyName("nextRunAt")]
        DateTime NextRunAt,

        [property: JsonPropertyName("lastRunAt")]
        DateTime LastRunAt
    );
}