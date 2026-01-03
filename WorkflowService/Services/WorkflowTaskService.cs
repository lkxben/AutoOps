using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using System.Data.Common;
using WorkflowService.Data;
using WorkflowService.Entities;
using WorkflowService.Extensions;
using WorkflowService.Protos;
using MassTransit;
using Contracts.Workflow;

namespace WorkflowService.Protos
{
    public class WorkflowTaskSvcImp : WorkflowTaskSvc.WorkflowTaskSvcBase
	{
		private readonly ILogger<WorkflowTaskSvcImp> _logger;
        private readonly WorkflowServiceContext _db;
        private readonly IPublishEndpoint _publishEndpoint;
		public WorkflowTaskSvcImp(ILogger<WorkflowTaskSvcImp> logger, WorkflowServiceContext db, IPublishEndpoint publishEndpoint) 
		{
			_logger = logger;
            _db = db;
            _publishEndpoint = publishEndpoint;
		}

        public override async Task<CreateWorkflowTaskResponse> CreateTask(CreateWorkflowTaskModel request, ServerCallContext context)
        {
            var task = new WorkflowTask
            {
                UserId = Guid.Parse(request.UserId),
                Title = request.Title,
                Prompt = request.Prompt,
            };
            _db.WorkflowTasks.Add(task);
            await _db.SaveChangesAsync();
            await _publishEndpoint.Publish(new WorkflowTaskCreated(task.Id, task.UserId, task.Prompt));
            return new CreateWorkflowTaskResponse { Id = task.Id.ToString() };
        }

        public override async Task<WorkflowTaskModel> GetTask(GetWorkflowTaskModel request, ServerCallContext context)
        {
            if (!Guid.TryParse(request.Id, out var taskId))
                throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid taskId"));
            var task = await _db.WorkflowTasks
                .SingleOrDefaultAsync(t =>
                    t.Id == taskId &&
                    t.UserId.ToString() == request.UserId);
            if (task == null)
                throw new RpcException(new Status(StatusCode.NotFound, "Task not found"));
            
            return task.ToModel();
        }

        public override async Task<UserTasksResponse> GetUserTasks(GetUserTasksModel request, ServerCallContext context)
        {
            if (!Guid.TryParse(request.UserId, out var userId))
                throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid userId"));

            var tasks = await _db.WorkflowTasks
                .AsNoTracking()
                .Where(t => t.UserId == userId)
                .ToListAsync();

            var response = new UserTasksResponse();
            response.Tasks.AddRange(tasks.Select(t => t.ToModel()));

            return response;
        }
	}
}