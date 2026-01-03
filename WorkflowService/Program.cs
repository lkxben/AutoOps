using WorkflowService.Data;
using WorkflowService.Entities;
using Microsoft.EntityFrameworkCore;
using WorkflowService.Protos;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using MassTransit;
using WorkflowService.Consumers;

var builder = WebApplication.CreateBuilder(args);

// services
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5003, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http2;
        listenOptions.UseHttps();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddDbContext<WorkflowServiceContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("LocalConnection")));

builder.Services.AddGrpc();

var rabbitMQSettings = builder.Configuration.GetSection("RabbitMQSettings").Get<RabbitMQSettings>();

builder.Services.AddMassTransit(x =>
{
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(rabbitMQSettings.Host, 6000, "/", h =>
        {
            h.Username(rabbitMQSettings.Username);
            h.Password(rabbitMQSettings.Password);
        });

        cfg.Publish<Contracts.Workflow.WorkflowTaskCreated>(p => p.Durable = true);
        cfg.Publish<Contracts.Workflow.WorkflowPlanCreated>(p => p.Durable = true);

        cfg.ConfigureEndpoints(context);
    });
});

builder.Services.AddHostedService<PlanDraftConsumer>();
builder.Services.AddHostedService<TaskUpdatedConsumer>();

var app = builder.Build();

app.MapGrpcService<WorkflowTaskSvcImp>();
app.MapGrpcService<WorkflowPlanSvcImp>();
app.Run();