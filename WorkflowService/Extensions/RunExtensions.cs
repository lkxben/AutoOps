using WorkflowService.Entities;
using WorkflowService.Protos;
using Google.Protobuf.WellKnownTypes;

namespace WorkflowService.Extensions
{
    public static class RunExtensions
    {

        public static RunModel ToModel(this Run run)
        {
            return new RunModel
            {
                Id = run.Id.ToString(),
                UserId = run.UserId.ToString(),
                TaskId = run.TaskId.ToString(),
                PlanId = run.PlanId.ToString(),
                Status = run.Status,
                Result = run.Result ?? "",
                CreatedAt = Timestamp.FromDateTime(DateTime.SpecifyKind(run.CreatedAt, DateTimeKind.Utc)),
                UpdatedAt = run.UpdatedAt.HasValue 
                    ? Timestamp.FromDateTime(DateTime.SpecifyKind(run.UpdatedAt.Value, DateTimeKind.Utc))
                    : null
            };
        }
    }
}