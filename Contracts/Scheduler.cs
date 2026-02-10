using System.Text.Json.Serialization;

namespace Contracts.Scheduler
{
    public record RunCreateRequest(
        [property: JsonPropertyName("user_id")] Guid UserId,
        [property: JsonPropertyName("task_id")] Guid TaskId,
        [property: JsonPropertyName("schedule_id")] Guid ScheduleId
    );

    public record ScheduleUpdated(
        [property: JsonPropertyName("user_id")] Guid UserId,
        [property: JsonPropertyName("task_id")] Guid TaskId,
        [property: JsonPropertyName("schedule_id")] Guid ScheduleId,
        [property: JsonPropertyName("next_run_at")] DateTime NextRunAt,
        [property: JsonPropertyName("last_run_at")] DateTime LastRunAt
    );
}