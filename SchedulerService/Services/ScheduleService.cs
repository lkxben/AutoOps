using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using SchedulerService.Data;
using SchedulerService.Entities;
using SchedulerService.Protos;
using MassTransit;
using Contracts.Workflow;
using NCrontab;
using System.Globalization;
using TimeZoneConverter;

namespace SchedulerService.Protos
{
    public class ScheduleSvcImp : ScheduleSvc.ScheduleSvcBase
	{
		private readonly ILogger<ScheduleSvcImp> _logger;
        private readonly SchedulerServiceContext _db;
        private readonly IPublishEndpoint _publishEndpoint;
		public ScheduleSvcImp(ILogger<ScheduleSvcImp> logger, SchedulerServiceContext db, IPublishEndpoint publishEndpoint) 
		{
			_logger = logger;
            _db = db;
            _publishEndpoint = publishEndpoint;
		}

        public override async Task<CreateScheduleResponse> CreateSchedule(CreateScheduleModel request, ServerCallContext context)
        {
            var mapping = await _db.TaskUserMappings.FirstOrDefaultAsync(e => e.TaskId == Guid.Parse(request.TaskId) 
                && e.UserId == Guid.Parse(request.UserId));
            
            if (mapping == null)
            {
                throw new RpcException(new Status(StatusCode.NotFound, "Task not found or access denied."));
            }

            CrontabSchedule schedule;
            try
            {
                schedule = CrontabSchedule.Parse(request.CronEx);
            }
            catch (Exception)
            {
                throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid cron expression."));
            }

            var timezone = string.IsNullOrEmpty(request.Timezone) ? "UTC" : request.Timezone;
            TimeZoneInfo tz;
            try
            {
                tz = TZConvert.GetTimeZoneInfo(timezone);
            }
            catch
            {
                throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid timezone."));
            }

            var nowLocal = TimeZoneInfo.ConvertTime(DateTime.UtcNow, tz);
            var nextLocal = schedule.GetNextOccurrence(nowLocal);
            var nextUtc = TimeZoneInfo.ConvertTimeToUtc(nextLocal, tz);

            var newSchedule = new Schedule
            {
                UserId = mapping.UserId,
                TaskId = mapping.TaskId,
                CronEx = request.CronEx,
                Timezone = timezone,
                NextRunAt = nextUtc
            };

            _db.Schedules.Add(newSchedule);
            await _db.SaveChangesAsync();
            return new CreateScheduleResponse
            {
                Id = newSchedule.Id.ToString(),
                NextRunAt = Timestamp.FromDateTime(newSchedule.NextRunAt.Value)
            };
        }

        public override async Task<EditScheduleResponse> EditSchedule(EditScheduleModel request, ServerCallContext context)
        {
            var schedule = await _db.Schedules.FirstOrDefaultAsync(s => s.Id == Guid.Parse(request.Id));
            
            if (schedule == null)
            {
                throw new RpcException(new Status(StatusCode.NotFound, "Schedule not found."));
            }

            CrontabSchedule cron;
            try
            {
                cron = CrontabSchedule.Parse(request.CronEx);
            }
            catch
            {
                throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid cron expression."));
            }

            TimeZoneInfo tz;
            try
            {
                tz = TZConvert.GetTimeZoneInfo(schedule.Timezone);
            }
            catch
            {
                tz = TimeZoneInfo.Utc;
            }

            var nowLocal = TimeZoneInfo.ConvertTime(DateTime.UtcNow, tz);
            var nextLocal = cron.GetNextOccurrence(nowLocal);
            var nextUtc = TimeZoneInfo.ConvertTimeToUtc(nextLocal, tz);

            schedule.CronEx = request.CronEx;
            schedule.Status = request.Status;
            schedule.NextRunAt = nextUtc;
            schedule.UpdatedAt = DateTime.UtcNow;
            
            await _db.SaveChangesAsync();
            return new EditScheduleResponse
            {
                Id = schedule.Id.ToString(),
                CronEx = schedule.CronEx,
                Status = schedule.Status,
                Timezone = schedule.Timezone,
                NextRunAt = Timestamp.FromDateTime(schedule.NextRunAt.Value)
            };
        }

        public override async Task<DeleteScheduleResponse> DeleteSchedule(DeleteScheduleModel request, ServerCallContext context)
        {
            var schedule = await _db.Schedules.FirstOrDefaultAsync(s => s.Id == Guid.Parse(request.Id));
            
            if (schedule == null)
            {
                throw new RpcException(new Status(StatusCode.NotFound, "Schedule not found."));
            }

            _db.Schedules.Remove(schedule);
            await _db.SaveChangesAsync();

            return new DeleteScheduleResponse { Success = true };
        }
    }
}