using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using SchedulerService.Data;
using SchedulerService.Entities;
using SchedulerService.Protos;
using Contracts.Workflow;
using Google.Protobuf.WellKnownTypes;
using Xunit;
using MassTransit;

namespace SchedulerService.Tests
{
    public class ScheduleSvcTests
    {
        private SchedulerServiceContext CreateInMemoryDb()
        {
            var options = new DbContextOptionsBuilder<SchedulerServiceContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            var config = new ConfigurationBuilder().Build();
            return new SchedulerServiceContext(options, config);
        }

        private ScheduleSvcImp CreateService(SchedulerServiceContext db)
        {
            var logger = new Mock<ILogger<ScheduleSvcImp>>().Object;
            var publish = new Mock<IPublishEndpoint>().Object;
            return new ScheduleSvcImp(logger, db, publish);
        }

        [Fact]
        public async Task GetTaskSchedules_ShouldReturnSchedules_WhenMappingExists()
        {
            var db = CreateInMemoryDb();
            var userId = Guid.NewGuid();
            var taskId = Guid.NewGuid();

            db.TaskUserMappings.Add(new TaskUserMapping
            {
                UserId = userId,
                TaskId = taskId
            });

            var schedule = new Schedule
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TaskId = taskId,
                CronEx = "* * * * *",
                Timezone = "UTC",
                NextRunAt = DateTime.UtcNow
            };

            db.Schedules.Add(schedule);
            await db.SaveChangesAsync();

            var service = CreateService(db);
            var result = await service.GetTaskSchedules(new GetTaskSchedulesModel
            {
                UserId = userId.ToString(),
                TaskId = taskId.ToString()
            }, null);

            result.Schedules.Should().HaveCount(1);
            result.Schedules[0].Id.Should().Be(schedule.Id.ToString());
        }

        [Fact]
        public async Task CreateSchedule_ShouldAddSchedule_WhenMappingExists()
        {
            var db = CreateInMemoryDb();
            var userId = Guid.NewGuid();
            var taskId = Guid.NewGuid();

            db.TaskUserMappings.Add(new TaskUserMapping
            {
                UserId = userId,
                TaskId = taskId
            });
            await db.SaveChangesAsync();

            var service = CreateService(db);
            var result = await service.CreateSchedule(new CreateScheduleModel
            {
                UserId = userId.ToString(),
                TaskId = taskId.ToString(),
                CronEx = "* * * * *",
                Timezone = "UTC"
            }, null);

            result.Should().NotBeNull();
            result.TaskId.Should().Be(taskId.ToString());

            db.Schedules.Should().ContainSingle(s => s.Id.ToString() == result.Id);
        }

        [Fact]
        public async Task EditSchedule_ShouldUpdateSchedule_WhenValid()
        {
            var db = CreateInMemoryDb();
            var userId = Guid.NewGuid();
            var taskId = Guid.NewGuid();
            var scheduleId = Guid.NewGuid();

            db.TaskUserMappings.Add(new TaskUserMapping
            {
                UserId = userId,
                TaskId = taskId
            });

            db.Schedules.Add(new Schedule
            {
                Id = scheduleId,
                UserId = userId,
                TaskId = taskId,
                CronEx = "* * * * *",
                Timezone = "UTC",
                NextRunAt = DateTime.UtcNow
            });

            await db.SaveChangesAsync();

            var service = CreateService(db);
            var result = await service.EditSchedule(new EditScheduleModel
            {
                Id = scheduleId.ToString(),
                UserId = userId.ToString(),
                CronEx = "*/5 * * * *",
                Status = ScheduleStatus.Active
            }, null);

            result.CronEx.Should().Be("*/5 * * * *");
            result.Status.Should().Be(ScheduleStatus.Active);
        }

        [Fact]
        public async Task DeleteSchedule_ShouldRemoveSchedule_WhenValid()
        {
            var db = CreateInMemoryDb();
            var userId = Guid.NewGuid();
            var taskId = Guid.NewGuid();
            var scheduleId = Guid.NewGuid();

            db.TaskUserMappings.Add(new TaskUserMapping
            {
                UserId = userId,
                TaskId = taskId
            });

            var schedule = new Schedule
            {
                Id = scheduleId,
                UserId = userId,
                TaskId = taskId,
                CronEx = "* * * * *",
                Timezone = "UTC",
                NextRunAt = DateTime.UtcNow
            };

            db.Schedules.Add(schedule);
            await db.SaveChangesAsync();

            var service = CreateService(db);
            var response = await service.DeleteSchedule(new DeleteScheduleModel
            {
                Id = scheduleId.ToString(),
                UserId = userId.ToString()
            }, null);

            response.Success.Should().BeTrue();
            db.Schedules.Should().BeEmpty();
        }
    }
}