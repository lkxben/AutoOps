using MassTransit;
using Contracts.Scheduler;
using EventService.Hubs;
using Microsoft.AspNetCore.SignalR;
using System.Text.Json.Serialization;
using EventService.Dtos;

namespace EventService.Consumers
{
    public class ScheduleUpdatedConsumer : IConsumer<ScheduleUpdated>
    {
        private readonly IHubContext<TaskHub> _hub;

        public ScheduleUpdatedConsumer(IHubContext<TaskHub> hub)
        {
            _hub = hub;
        }


        public async Task Consume(ConsumeContext<ScheduleUpdated> context)
        {
            var message = context.Message;

            Console.WriteLine($"Received schedule update for Schedule {message.ScheduleId}");

            var dto = new ScheduleUpdatedDto(
                UserId: message.UserId.ToString(),
                TaskId: message.TaskId.ToString(),
                ScheduleId: message.ScheduleId.ToString(),
                NextRunAt: message.NextRunAt,
                LastRunAt: message.LastRunAt
            );

            await _hub.Clients
                .User(dto.UserId)
                .SendAsync("ScheduleUpdated", dto);
        }
    }
}