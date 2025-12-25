using WorkflowService.Data;
using WorkflowService.Entities;
using Microsoft.EntityFrameworkCore;
using WorkflowService.Protos;
using Microsoft.AspNetCore.Server.Kestrel.Core;

var builder = WebApplication.CreateBuilder(args);

// services
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5002, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http2;
        listenOptions.UseHttps();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddDbContext<WorkflowServiceContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("LocalConnection")));

builder.Services.AddGrpc();

var app = builder.Build();

app.MapGrpcService<WorkflowTaskSvcImp>();
app.Run();