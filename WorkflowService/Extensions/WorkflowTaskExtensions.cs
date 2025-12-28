using WorkflowService.Entities;
using WorkflowService.Protos;

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
                InputData = task.InputData,
                Status = task.Status,
                Results = task.Results!
            };
        }
    }
}