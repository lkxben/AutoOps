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
    public class RunSvcImp : RunSvc.RunSvcBase
	{
		private readonly ILogger<RunSvcImp> _logger;
        private readonly WorkflowServiceContext _db;
        private readonly IPublishEndpoint _publishEndpoint;
		public RunSvcImp(ILogger<RunSvcImp> logger, WorkflowServiceContext db, IPublishEndpoint publishEndpoint) 
		{
			_logger = logger;
            _db = db;
            _publishEndpoint = publishEndpoint;
		}

        public override async Task<CreateRunResponse> CreateRun(CreateRunModel request, ServerCallContext context)
        {
            var task = await _db.WorkflowTasks.FirstOrDefaultAsync(t => t.Id == Guid.Parse(request.TaskId) 
                && t.UserId == Guid.Parse(request.UserId));
            
            if (task == null)
            {
                throw new RpcException(new Status(StatusCode.NotFound, "Task not found or access denied."));
            }

            var plan = await _db.WorkflowPlans.FirstOrDefaultAsync(p => p.TaskId == task.Id);

            if (plan == null)
            {
                throw new RpcException(new Status(StatusCode.FailedPrecondition, "Task does not have a plan."));
            }

            var run = new Run
            {
                UserId = task.UserId,
                TaskId = task.Id,
                PlanId = plan.Id
            };
            _db.Runs.Add(run);
            await _db.SaveChangesAsync();
            await _publishEndpoint.Publish(new RunCreated(run.Id, task.Id, task.UserId, task.Prompt));
            return new CreateRunResponse { Id = run.Id.ToString() };
        }

        public override async Task<UserRunsResponse> GetUserRuns(GetUserRunsModel request, ServerCallContext context)
        {
            if (!Guid.TryParse(request.UserId, out var userId))
                throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid userId"));

            var runs = await _db.Runs
                .AsNoTracking()
                .Where(r => r.UserId == userId)
                .ToListAsync();

            var response = new UserRunsResponse();
            response.Runs.AddRange(runs.Select(r => r.ToModel()));
            
            return response;
        }
    }
}