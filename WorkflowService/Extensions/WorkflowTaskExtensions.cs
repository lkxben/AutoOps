using WorkflowService.Entities;
using WorkflowService.Protos;
using Google.Protobuf.WellKnownTypes;

namespace WorkflowService.Extensions
{
    public static class WorkflowTaskExtensions
    {

        public static WorkflowTaskModel ToModel(this WorkflowTask task)
        {
            return new WorkflowTaskModel
            {
                Id = task.Id.ToString(),
                UserId = task.UserId.ToString(),
                Title = task.Title,
                Prompt = task.Prompt,
                Status = task.Status,
                Result = task.Result ?? "",
                CreatedAt = Timestamp.FromDateTime(DateTime.SpecifyKind(task.CreatedAt, DateTimeKind.Utc)),
                UpdatedAt = task.UpdatedAt.HasValue 
                    ? Timestamp.FromDateTime(DateTime.SpecifyKind(task.UpdatedAt.Value, DateTimeKind.Utc))
                    : null
            };
        }
    }
}