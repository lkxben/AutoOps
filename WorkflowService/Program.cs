using WorkflowService.Data;
using WorkflowService.Entities;
using Microsoft.EntityFrameworkCore;
using WorkflowService.Protos;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using MassTransit;
using WorkflowService.Consumers;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// services
var grpcPort = builder.Configuration.GetValue<int>("Grpc:Port", 5003);
var dbConnection = builder.Configuration.GetConnectionString("WorkflowServiceDb") 
                   ?? throw new Exception("WorkflowServiceDb connection string is missing");
var schema = builder.Configuration["DatabaseSchema"] ?? "workflow";

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(grpcPort, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http2;
    });
});

builder.Services.Configure<RabbitMQSettings>(
    builder.Configuration.GetSection("RabbitMQSettings"));

builder.Services.AddSingleton(sp =>
    sp.GetRequiredService<IOptions<RabbitMQSettings>>().Value);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddDbContext<WorkflowServiceContext>(options =>
{
    options.UseNpgsql(dbConnection, npgsqlOptions =>
        npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", schema));
});

builder.Services.AddGrpc();

var rabbitMQSettings = builder.Configuration.GetSection("RabbitMQSettings").Get<RabbitMQSettings>();

if (!int.TryParse(rabbitMQSettings.Port, out var port))
{
    port = 5672; // default RabbitMQ port
}
var uri = new Uri($"rabbitmq://{rabbitMQSettings.Host}:{port}/");

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<RunCreateRequestConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(uri, h =>
        {
            h.Username(rabbitMQSettings.Username);
            h.Password(rabbitMQSettings.Password);
        });

        cfg.Publish<Contracts.Workflow.WorkflowTaskCreated>(p => p.Durable = true);
        cfg.Publish<Contracts.Workflow.RunCreated>(p => p.Durable = true);

        cfg.ConfigureEndpoints(context);
    });
});

builder.Services.AddHostedService<PlanDraftConsumer>();
builder.Services.AddHostedService<RunUpdatedConsumer>();

var app = builder.Build();

using var scope = app.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<WorkflowServiceContext>();

var retries = 0;
var maxRetries = 10;
while (true)
{
    try
    {
        db.Database.Migrate();
        break;
    }
    catch (Npgsql.NpgsqlException)
    {
        retries++;
        if (retries >= maxRetries) throw;
        Console.WriteLine("Postgres not ready yet, retrying in 5s...");
        await Task.Delay(5000);
    }
}

app.MapGrpcService<WorkflowTaskSvcImp>();
app.MapGrpcService<WorkflowPlanSvcImp>();
app.MapGrpcService<RunSvcImp>();
app.MapGet("/health", () => Results.Ok());
app.Run();