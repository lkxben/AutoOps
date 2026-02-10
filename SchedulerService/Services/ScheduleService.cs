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

        public override async Task<GetTaskSchedulesResponse> GetTaskSchedules(GetTaskSchedulesModel request, ServerCallContext context)
        {
            if (!Guid.TryParse(request.UserId, out var userId))
                throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid userId"));

            if (!Guid.TryParse(request.TaskId, out var taskId))
                throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid taskId"));
            
            var mappingExists = await _db.TaskUserMappings
                .AnyAsync(m => m.UserId == userId && m.TaskId == taskId);

            if (!mappingExists)
                throw new RpcException(new Status(StatusCode.NotFound, "Task not found or access denied"));

            var schedules = await _db.Schedules
                .Where(s => s.TaskId == taskId && s.UserId == userId)
                .OrderBy(s => s.CreatedAt)
                .ToListAsync();

            var response = new GetTaskSchedulesResponse();

            response.Schedules.AddRange(schedules.Select(s => new ScheduleModel
            {
                Id = s.Id.ToString(),
                TaskId = s.TaskId.ToString(),
                Status = s.Status,
                CronEx = s.CronEx,
                Timezone = s.Timezone,
                NextRunAt = Timestamp.FromDateTime(DateTime.SpecifyKind(s.NextRunAt, DateTimeKind.Utc)),
                LastRunAt = s.LastRunAt.HasValue 
                    ? Timestamp.FromDateTime(DateTime.SpecifyKind(s.LastRunAt.Value, DateTimeKind.Utc))
                    : null
            }));

            return response;
        }

        public override async Task<ScheduleModel> CreateSchedule(CreateScheduleModel request, ServerCallContext context)
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
            return new ScheduleModel
            {
                Id = newSchedule.Id.ToString(),
                TaskId = newSchedule.TaskId.ToString(),
                Status = newSchedule.Status,
                CronEx = newSchedule.CronEx,
                Timezone = newSchedule.Timezone,
                NextRunAt = Timestamp.FromDateTime(DateTime.SpecifyKind(newSchedule.NextRunAt, DateTimeKind.Utc)),
                LastRunAt = newSchedule.LastRunAt.HasValue
                    ? Timestamp.FromDateTime(DateTime.SpecifyKind(newSchedule.LastRunAt.Value, DateTimeKind.Utc))
                    : null
            };
        }

        public override async Task<ScheduleModel> EditSchedule(EditScheduleModel request, ServerCallContext context)
        {
            var userId = Guid.Parse(request.UserId);
            var scheduleId = Guid.Parse(request.Id);
            
            var schedule = await _db.Schedules.FirstOrDefaultAsync(s => s.Id == scheduleId);
            if (schedule == null)
            {
                throw new RpcException(new Status(StatusCode.NotFound, "Schedule not found."));
            }

            var mapping = await _db.TaskUserMappings
                .FirstOrDefaultAsync(m => m.TaskId == schedule.TaskId && m.UserId == userId);
            
            if (mapping == null)
            {
                throw new RpcException(new Status(StatusCode.NotFound, "Access denied. Schedule does not belong to this user."));
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
            return new ScheduleModel
            {
                Id = schedule.Id.ToString(),
                TaskId = schedule.TaskId.ToString(),
                Status = schedule.Status,
                CronEx = schedule.CronEx,
                Timezone = schedule.Timezone,
                NextRunAt = Timestamp.FromDateTime(DateTime.SpecifyKind(schedule.NextRunAt, DateTimeKind.Utc)),
                LastRunAt = schedule.LastRunAt.HasValue
                    ? Timestamp.FromDateTime(DateTime.SpecifyKind(schedule.LastRunAt.Value, DateTimeKind.Utc))
                    : null
            };
        }

        public override async Task<DeleteScheduleResponse> DeleteSchedule(DeleteScheduleModel request, ServerCallContext context)
        {
            var userId = Guid.Parse(request.UserId);
            var scheduleId = Guid.Parse(request.Id);

            var schedule = await _db.Schedules.FirstOrDefaultAsync(s => s.Id == scheduleId);
            if (schedule == null)
            {
                throw new RpcException(new Status(StatusCode.NotFound, "Schedule not found."));
            }

            var mapping = await _db.TaskUserMappings
                .FirstOrDefaultAsync(m => m.TaskId == schedule.TaskId && m.UserId == userId);
            
            if (mapping == null)
            {
                throw new RpcException(new Status(StatusCode.NotFound, "Access denied. Schedule does not belong to this user."));
            }

            _db.Schedules.Remove(schedule);
            await _db.SaveChangesAsync();

            return new DeleteScheduleResponse { Success = true };
        }
    }
}