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

namespace WorkflowService.Protos
{
    public class WorkflowTaskSvcImp : WorkflowTaskSvc.WorkflowTaskSvcBase
	{
		private readonly ILogger<WorkflowTaskSvcImp> _logger;
        private readonly WorkflowServiceContext _db;
        private readonly IConfiguration _configuration;
		public WorkflowTaskSvcImp(ILogger<WorkflowTaskSvcImp> logger, WorkflowServiceContext db, IConfiguration configuration) 
		{
			_logger = logger;
            _db = db;
            _configuration = configuration;
		}

        public override async Task<CreateWorkflowTaskResponse> CreateTask(CreateWorkflowTaskModel request, ServerCallContext context)
        {
            var task = new WorkflowTask
            {
                InputData = request.InputData
            };
            _db.WorkflowTasks.Add(task);
            await _db.SaveChangesAsync();
            return new CreateWorkflowTaskResponse { Id = task.Id.ToString() };
        }

        public override async Task<WorkflowTaskModel> GetTask(GetWorkflowTaskModel request, ServerCallContext context)
        {
            if (!Guid.TryParse(request.Id, out var taskId))
                throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid task ID"));
            var task = await _db.WorkflowTasks.SingleOrDefaultAsync(t => t.Id == taskId);
            if (task == null)
                throw new RpcException(new Status(StatusCode.NotFound, "Task not found"));
            return task.ToModel();
        }
	}
}