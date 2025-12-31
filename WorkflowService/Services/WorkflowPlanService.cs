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
using System.Numerics;
using System.Text.Json.Nodes;

namespace WorkflowService.Protos
{
    public class WorkflowPlanSvcImp : WorkflowPlanSvc.WorkflowPlanSvcBase
	{
		private readonly ILogger<WorkflowPlanSvcImp> _logger;
        private readonly WorkflowServiceContext _db;
        private readonly IPublishEndpoint _publishEndpoint;
		public WorkflowPlanSvcImp(ILogger<WorkflowPlanSvcImp> logger, WorkflowServiceContext db, IPublishEndpoint publishEndpoint) 
		{
			_logger = logger;
            _db = db;
            _publishEndpoint = publishEndpoint;
		}

        public override async Task<CreateWorkflowPlanResponse> CreatePlan(CreateWorkflowPlanModel request, ServerCallContext context)
        {
            var plan = new WorkflowPlan
            {
                TaskId = Guid.Parse(request.TaskId),
                UserId = Guid.Parse(request.UserId),
                Plan = request.Plan
            };
            _db.WorkflowPlans.Add(plan);
            await _db.SaveChangesAsync();
            await _publishEndpoint.Publish(new WorkflowPlanCreated(plan.Id, plan.TaskId, plan.UserId, plan.Plan));
            return new CreateWorkflowPlanResponse { Id = plan.Id.ToString() };
        }
    }
}