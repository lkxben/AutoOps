using Grpc.Net.Client;
using Grpc.Core;
using SchedulerService.Data;
using MassTransit;
using SchedulerService.Protos;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using SchedulerService.Consumers;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using System.Data.Common;
using Hangfire;
using Hangfire.PostgreSql;

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
    x.AddConsumer<RunCreatedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(uri, h =>
        {
            h.Username(rabbitMQSettings.Username);
            h.Password(rabbitMQSettings.Password);
        });
        cfg.Publish<Contracts.Scheduler.RunCreateRequest>(p => p.Durable = true);
        cfg.Publish<Contracts.Scheduler.ScheduleUpdated>(p => p.Durable = true);
        cfg.ConfigureEndpoints(context);
    });
});

// hangfire
builder.Services.AddHangfire(config =>
{
    config.UsePostgreSqlStorage(
        dbConnection,
        new Hangfire.PostgreSql.PostgreSqlStorageOptions
        {
            SchemaName = schema
        }
    );
});

builder.Services.AddHangfireServer(options =>
{
    options.SchedulePollingInterval = TimeSpan.FromSeconds(5);
});
builder.Services.AddScoped<ScheduleRunner>();

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
app.MapGrpcService<ScheduleSvcImp>();

using var hangfireScope = app.Services.CreateScope();
var recurringJobManager = hangfireScope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
var runner = hangfireScope.ServiceProvider.GetRequiredService<ScheduleRunner>();
recurringJobManager.AddOrUpdate(
    "run-due-schedules",
    () => runner.RunDueSchedules(),
    "*/15 * * * * *"
);

app.Run();