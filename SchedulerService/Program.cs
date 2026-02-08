using Grpc.Net.Client;
using Grpc.Core;
using SchedulerService.Data;
using MassTransit;
using SchedulerService.Protos;
using WorkflowService.Protos;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using SchedulerService.Consumers;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// server
var grpcPort = builder.Configuration.GetValue<int>("Grpc:Port", 5007);
var dbConnection = builder.Configuration.GetConnectionString("SchedulerServiceDb") 
                   ?? throw new Exception("SchedulerServiceDb connection string is missing");
var schema = builder.Configuration["DatabaseSchema"] ?? "scheduler";

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(grpcPort, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http2;
    });
});

// client
var workflowServiceUrl = builder.Configuration["Grpc:WorkflowService"] 
                             ?? throw new Exception("Grpc:WorkflowService configuration is missing");

builder.Services.AddGrpcClient<RunSvc.RunSvcClient>(o =>
{
    o.Address = new Uri(workflowServiceUrl);
})
.ConfigureChannel(o => o.MaxRetryAttempts = 0)
.AddInterceptor(() => new DeadlineInterceptor(TimeSpan.FromSeconds(1.5)));

builder.Services.AddDbContext<SchedulerServiceContext>(options =>
{
    options.UseNpgsql(dbConnection, npgsqlOptions =>
        npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", schema));
});

builder.Services.AddGrpc();

// rabbitmq
builder.Services.Configure<RabbitMQSettings>(
    builder.Configuration.GetSection("RabbitMQSettings"));

builder.Services.AddSingleton(sp =>
    sp.GetRequiredService<IOptions<RabbitMQSettings>>().Value);

var rabbitMQSettings = builder.Configuration.GetSection("RabbitMQSettings").Get<RabbitMQSettings>();

if (!int.TryParse(rabbitMQSettings.Port, out var port))
{
    port = 5672; // default RabbitMQ port
}

var uri = new Uri($"rabbitmq://{rabbitMQSettings.Host}:{port}/");

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<WorkflowTaskCreatedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(uri, h =>
        {
            h.Username(rabbitMQSettings.Username);
            h.Password(rabbitMQSettings.Password);
        });
        cfg.ConfigureEndpoints(context);
    });
});

var app = builder.Build();

using var scope = app.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<SchedulerServiceContext>();

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

app.Run();