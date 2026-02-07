using Grpc.Net.Client;
using Grpc.Core;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Numerics;
using System.Text.RegularExpressions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var workflowServiceUrl = builder.Configuration["Grpc:WorkflowService"] 
                             ?? throw new Exception("Grpc:WorkflowService configuration is missing");

builder.Services.AddGrpcClient<RunSvc.RunSvcClient>(o =>
{
    o.Address = new Uri(workflowServiceUrl);
})
.ConfigureChannel(o => o.MaxRetryAttempts = 0)
.AddInterceptor(() => new DeadlineInterceptor(TimeSpan.FromSeconds(1.5)));

var app = builder.Build();

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.Run();