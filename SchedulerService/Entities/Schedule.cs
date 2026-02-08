using SchedulerService.Protos;

namespace SchedulerService.Entities
{
    public class Schedule
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public Guid TaskId { get; set; }
        public ScheduleStatus Status { get; set ;} = ScheduleStatus.Active;
        public required string CronEx { get; set; }
        public string Timezone { get; set; } = "UTC";
        public DateTime? NextRunAt { get; set; }
        public DateTime? LastRunAt { get; set; }
        public DateTime? LockedUntil { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}