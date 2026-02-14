using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using WorkflowService.Data;
using WorkflowService.Entities;
using WorkflowService.Protos;
using Contracts.Workflow;
using Grpc.Core;
using Xunit;
using Moq;

namespace WorkflowService.Tests
{
    public class WorkflowTaskSvcTests
    {
        private WorkflowServiceContext CreateInMemoryDb()
        {
            var options = new DbContextOptionsBuilder<WorkflowServiceContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            var config = new ConfigurationBuilder().Build();
            return new WorkflowServiceContext(options, config);
        }

        private WorkflowTaskSvcImp CreateService(WorkflowServiceContext db, out Mock<IPublishEndpoint> publishMock)
        {
            var logger = new Mock<ILogger<WorkflowTaskSvcImp>>().Object;
            publishMock = new Mock<IPublishEndpoint>();
            return new WorkflowTaskSvcImp(logger, db, publishMock.Object);
        }

        [Fact]
        public async Task CreateTask_ShouldSaveTaskAndPublishEvent()
        {
            var db = CreateInMemoryDb();
            var service = CreateService(db, out var publishMock);

            var request = new CreateWorkflowTaskModel
            {
                UserId = Guid.NewGuid().ToString(),
                Title = "Test Task",
                Prompt = "Do something"
            };
            var contextMock = new Mock<ServerCallContext>().Object;

            var response = await service.CreateTask(request, contextMock);

            var taskInDb = db.WorkflowTasks.FirstOrDefault(t => t.Id.ToString() == response.Id);
            taskInDb.Should().NotBeNull();
            taskInDb.Title.Should().Be("Test Task");
            
            publishMock.Verify(p => p.Publish(It.IsAny<WorkflowTaskCreated>(), default), Times.Once);
        }

        [Fact]
        public async Task GetTask_ShouldReturnTask_WhenExists()
        {
            var db = CreateInMemoryDb();
            var userId = Guid.NewGuid();
            var task = new WorkflowTask
            {
                UserId = userId,
                Title = "Task 1",
                Prompt = "Prompt"
            };
            db.WorkflowTasks.Add(task);
            await db.SaveChangesAsync();

            var service = CreateService(db, out _);

            var request = new GetWorkflowTaskModel
            {
                Id = task.Id.ToString(),
                UserId = userId.ToString()
            };

            var result = await service.GetTask(request, null);

            result.Should().NotBeNull();
            result.Title.Should().Be("Task 1");
        }

        [Fact]
        public async Task GetTask_ShouldThrowRpcException_WhenInvalidId()
        {
            var db = CreateInMemoryDb();
            var service = CreateService(db, out _);

            var request = new GetWorkflowTaskModel
            {
                Id = "invalid-guid",
                UserId = Guid.NewGuid().ToString()
            };

            await Assert.ThrowsAsync<RpcException>(async () =>
            {
                await service.GetTask(request, null);
            });
        }

        [Fact]
        public async Task GetUserTasks_ShouldReturnAllTasksForUser()
        {
            var db = CreateInMemoryDb();
            var userId = Guid.NewGuid();
            db.WorkflowTasks.Add(new WorkflowTask { UserId = userId, Title = "T1", Prompt = "Test" });
            db.WorkflowTasks.Add(new WorkflowTask { UserId = userId, Title = "T2", Prompt = "Test" });
            db.WorkflowTasks.Add(new WorkflowTask { UserId = Guid.NewGuid(), Title = "Other", Prompt = "Test" });
            await db.SaveChangesAsync();

            var service = CreateService(db, out _);

            var request = new GetUserTasksModel
            {
                UserId = userId.ToString()
            };

            var result = await service.GetUserTasks(request, null);

            result.Tasks.Count.Should().Be(2);
            result.Tasks.Select(t => t.Title).Should().Contain(new[] { "T1", "T2" });
        }
    }
}