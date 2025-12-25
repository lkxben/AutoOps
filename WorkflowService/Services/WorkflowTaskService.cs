using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;

namespace WorkflowTaskService.Proto
{
    public class WorkflowTaskImp : WorkflowTask.WorkflowTaskBase
	{
		private readonly ILogger<WorkflowTaskImp> _logger;
        private readonly AuthServiceContext _db;
        private readonly IConfiguration _configuration;
		public WorkflowTaskImp(ILogger<WorkflowTaskImp> logger, AuthServiceContext db, IConfiguration configuration) 
		{
			_logger = logger;
            _db = db;
            _configuration = configuration;
		}

        public override async Task CreateTask(CreateWorkflowTaskModel request, ServerCallContext context)
        {
            var users = await _db.Users.Select(user => user.ToModel()).ToListAsync(); 
            foreach (var user in users)
            {
                await responseStream.WriteAsync(user);
            }
        }

        public override async Task GetTask(GetWorkflowTaskModel request, ServerCallContext context)
        {
            var users = await _db.Users.Select(user => user.ToModel()).ToListAsync(); 
            foreach (var user in users)
            {
                await responseStream.WriteAsync(user);
            }
        }
	}
}