using WorkflowService.Entities;
using WorkflowService.Protos;
using Google.Protobuf.WellKnownTypes;

namespace WorkflowService.Extensions
{
    public static class WorkflowPlanExtensions
    {

        public static WorkflowPlanModel ToModel(this WorkflowPlan plan)
        {
            return new WorkflowPlanModel
            {
                Id = plan.Id.ToString(),
                TaskId = plan.TaskId.ToString(),
                Graph = plan.Graph,
                CreatedAt = Timestamp.FromDateTime(DateTime.SpecifyKind(plan.CreatedAt, DateTimeKind.Utc)),
                UpdatedAt = plan.UpdatedAt.HasValue 
                    ? Timestamp.FromDateTime(DateTime.SpecifyKind(plan.UpdatedAt.Value, DateTimeKind.Utc))
                    : null
            };
        }
    }
}