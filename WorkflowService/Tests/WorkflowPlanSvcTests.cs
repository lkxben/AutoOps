using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using WorkflowService.Data;
using WorkflowService.Entities;
using WorkflowService.Protos;
using Contracts.Workflow;
using Grpc.Core;
using Xunit;
using Moq;

namespace WorkflowService.Tests
{
    public class WorkflowPlanSvcTests
    {
        private WorkflowServiceContext CreateInMemoryDb()
        {
            var options = new DbContextOptionsBuilder<WorkflowServiceContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            var config = new ConfigurationBuilder().Build();
            return new WorkflowServiceContext(options, config);
        }

        private WorkflowPlanSvcImp CreateService(WorkflowServiceContext db, out Mock<IPublishEndpoint> publishMock)
        {
            var logger = new Mock<ILogger<WorkflowPlanSvcImp>>().Object;
            publishMock = new Mock<IPublishEndpoint>();
            return new WorkflowPlanSvcImp(logger, db, publishMock.Object);
        }

        [Fact]
        public async Task SavePlan_ShouldCreatePlanAndFinalizeTask()
        {
            var db = CreateInMemoryDb();
            var userId = Guid.NewGuid();
            var task = new WorkflowTask
            {
                UserId = userId,
                Title = "Task 1",
                Prompt = "Prompt",
                Status = WorkflowTaskStatus.Pending
            };
            db.WorkflowTasks.Add(task);
            await db.SaveChangesAsync();
            db.Entry(task).State = EntityState.Detached;

            var service = CreateService(db, out _);

            var request = new CreateWorkflowPlanModel
            {
                UserId = userId.ToString(),
                TaskId = task.Id.ToString(),
                Graph = "{\"nodes\":[],\"edges\":[]}"
            };
            var contextMock = new Mock<ServerCallContext>().Object;

            var response = await service.SavePlan(request, contextMock);

            var planInDb = db.WorkflowPlans.FirstOrDefault(p => p.Id.ToString() == response.Id);
            planInDb.Should().NotBeNull();
            planInDb.TaskId.Should().Be(task.Id);

            var updatedTask = await db.WorkflowTasks.FindAsync(task.Id);
            updatedTask.Status.Should().Be(WorkflowTaskStatus.Finalized);
        }

        [Fact]
        public async Task SavePlan_ShouldUpdateExistingPlan()
        {
            var db = CreateInMemoryDb();
            var userId = Guid.NewGuid();
            var task = new WorkflowTask { UserId = userId, Title = "T", Prompt = "P", Status = WorkflowTaskStatus.Pending };
            db.WorkflowTasks.Add(task);

            var plan = new WorkflowPlan
            {
                UserId = userId,
                TaskId = task.Id,
                Graph = "{\"nodes\":[1]}"
            };
            db.WorkflowPlans.Add(plan);
            await db.SaveChangesAsync();
            db.Entry(task).State = EntityState.Detached;

            var service = CreateService(db, out _);

            var request = new CreateWorkflowPlanModel
            {
                UserId = userId.ToString(),
                TaskId = task.Id.ToString(),
                Graph = "{\"nodes\":[1,2]}"
            };

            var updatedPlanResponse = await service.SavePlan(request, new Mock<ServerCallContext>().Object);

            var planInDb = db.WorkflowPlans.Find(plan.Id);
            planInDb.Graph.Should().Be("{\"nodes\":[1,2]}");
        }

        [Fact]
        public async Task GetPlanByTaskId_ShouldReturnPlan_WhenExists()
        {
            var db = CreateInMemoryDb();
            var userId = Guid.NewGuid();
            var task = new WorkflowTask { UserId = userId, Title = "T", Prompt = "P", Status = WorkflowTaskStatus.Pending };
            db.WorkflowTasks.Add(task);

            var plan = new WorkflowPlan
            {
                UserId = userId,
                TaskId = task.Id,
                Graph = "{\"nodes\":[]}"
            };
            db.WorkflowPlans.Add(plan);
            await db.SaveChangesAsync();
            db.Entry(task).State = EntityState.Detached;

            var service = CreateService(db, out _);

            var request = new GetPlanByTaskIdModel
            {
                UserId = userId.ToString(),
                TaskId = task.Id.ToString()
            };

            var result = await service.GetPlanByTaskId(request, new Mock<ServerCallContext>().Object);

            result.Should().NotBeNull();
            result.TaskId.Should().Be(task.Id.ToString());
        }

        [Fact]
        public async Task GetPlanByTaskId_ShouldThrow_WhenPlanNotFound()
        {
            var db = CreateInMemoryDb();
            var service = CreateService(db, out _);

            var request = new GetPlanByTaskIdModel
            {
                UserId = Guid.NewGuid().ToString(),
                TaskId = Guid.NewGuid().ToString()
            };

            await Assert.ThrowsAsync<RpcException>(async () =>
            {
                await service.GetPlanByTaskId(request, new Mock<ServerCallContext>().Object);
            });
        }
    }
}