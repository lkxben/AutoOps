using System.Text.Json.Serialization;

namespace Contracts.Scheduler
{
    public record RunCreateRequest(
        [property: JsonPropertyName("user_id")] Guid UserId,
        [property: JsonPropertyName("task_id")] Guid TaskId,
        [property: JsonPropertyName("schedule_id")] Guid ScheduleId
    );
}