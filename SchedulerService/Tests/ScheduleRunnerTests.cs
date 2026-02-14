using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using SchedulerService.Data;
using SchedulerService.Entities;
using SchedulerService.Protos;
using MassTransit;
using Contracts.Scheduler;
using Xunit;

namespace SchedulerService.Tests
{
    public class ScheduleRunnerTests
    {
        private SchedulerServiceContext CreateInMemoryDb()
        {
            var options = new DbContextOptionsBuilder<SchedulerServiceContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            var config = new ConfigurationBuilder().Build();
            return new SchedulerServiceContext(options, config);
        }

        private ScheduleRunner CreateRunner(SchedulerServiceContext db, out Mock<IPublishEndpoint> publishMock)
        {
            var logger = new Mock<ILogger<ScheduleRunner>>().Object;
            publishMock = new Mock<IPublishEndpoint>();
            return new ScheduleRunner(db, publishMock.Object, logger);
        }

        [Fact]
        public async Task RunDueSchedules_ShouldPublishRunCreateRequest_ForDueSchedule()
        {
            var db = CreateInMemoryDb();
            var schedule = new Schedule
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                TaskId = Guid.NewGuid(),
                CronEx = "* * * * *", // every minute
                Timezone = "UTC",
                Status = ScheduleStatus.Active,
                NextRunAt = DateTime.UtcNow.AddSeconds(-1)
            };
            db.Schedules.Add(schedule);
            await db.SaveChangesAsync();
            db.Entry(schedule).State = EntityState.Detached;

            var runner = CreateRunner(db, out var publishMock);

            await runner.RunDueSchedules();

            var updated = await db.Schedules.FindAsync(schedule.Id);
            updated.NextRunAt.Should().BeAfter(DateTime.UtcNow);
            publishMock.Verify(p => p.Publish(It.Is<RunCreateRequest>(
                r => r.ScheduleId == schedule.Id &&
                     r.TaskId == schedule.TaskId &&
                     r.UserId == schedule.UserId
            ), default), Times.Once);
        }

        [Fact]
        public async Task RunDueSchedules_ShouldSkipMissedSchedule()
        {
            var db = CreateInMemoryDb();
            var schedule = new Schedule
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                TaskId = Guid.NewGuid(),
                CronEx = "* * * * *",
                Timezone = "UTC",
                Status = ScheduleStatus.Active,
                NextRunAt = DateTime.UtcNow.AddMinutes(-5) // too late
            };
            db.Schedules.Add(schedule);
            await db.SaveChangesAsync();
            db.Entry(schedule).State = EntityState.Detached;

            var runner = CreateRunner(db, out var publishMock);

            await runner.RunDueSchedules();

            publishMock.Verify(p => p.Publish(It.IsAny<RunCreateRequest>(), default), Times.Never);
        }

        [Fact]
        public async Task RunDueSchedules_ShouldHandleInvalidCronAndTimezone()
        {
            var db = CreateInMemoryDb();
            var schedule = new Schedule
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                TaskId = Guid.NewGuid(),
                CronEx = "INVALID",
                Timezone = "INVALID",
                Status = ScheduleStatus.Active,
                NextRunAt = DateTime.UtcNow.AddSeconds(-1)
            };
            db.Schedules.Add(schedule);
            await db.SaveChangesAsync();
            db.Entry(schedule).State = EntityState.Detached;

            var runner = CreateRunner(db, out var publishMock);

            await runner.RunDueSchedules();

            publishMock.Verify(p => p.Publish(It.IsAny<RunCreateRequest>(), default), Times.Never);
        }

        [Fact]
        public async Task RunDueSchedules_ShouldLockScheduleDuringProcessing()
        {
            var db = CreateInMemoryDb();
            var schedule = new Schedule
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                TaskId = Guid.NewGuid(),
                CronEx = "* * * * *",
                Timezone = "UTC",
                Status = ScheduleStatus.Active,
                NextRunAt = DateTime.UtcNow.AddSeconds(-1)
            };
            db.Schedules.Add(schedule);
            await db.SaveChangesAsync();
            db.Entry(schedule).State = EntityState.Detached;

            var runner = CreateRunner(db, out var publishMock);

            await runner.RunDueSchedules();

            var updated = await db.Schedules.FindAsync(schedule.Id);
            updated.LockedUntil.Should().BeAfter(DateTime.UtcNow);
        }
    }
}