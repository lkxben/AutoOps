using EventService.Consumers;
using EventService.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.Extensions.Options;
using System.Text.RegularExpressions;
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

var prodUrl = builder.Configuration["Frontend__Prod"] ?? "";

var regexPattern = builder.Configuration["Frontend__UrlsRegex"] 
                         ?? @"^https://auto-[a-z0-9]+-benjamins-projects-[a-z0-9]+\.vercel\.app$";

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
              .SetIsOriginAllowed(origin =>
              {
                  if (origin.Contains("localhost")) return true;

                  if (Regex.IsMatch(origin, prodUrl, RegexOptions.IgnoreCase))
                      return true;
                      
                  if (Regex.IsMatch(origin, regexPattern, RegexOptions.IgnoreCase))
                      return true;

                  return false;
              });
    });
});

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
    x.AddConsumer<ScheduleUpdatedConsumer>();

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

var jwtKey = builder.Configuration["Jwt:Key"] 
             ?? throw new Exception("JWT:Key configuration is missing");
var key = Encoding.UTF8.GetBytes(jwtKey);

var jwtIssuer = builder.Configuration["Jwt:Issuer"] 
                ?? throw new Exception("JWT:Issuer configuration is missing");
var jwtAudience = builder.Configuration["Jwt:Audience"] 
                  ?? throw new Exception("JWT:Audience configuration is missing");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(5),
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) &&
                path.StartsWithSegments("/ws"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();
builder.Services.AddSignalR();
builder.Services.AddHostedService<RunUpdatedConsumer>();
builder.Services.AddHostedService<PlanDraftConsumer>();

var app = builder.Build();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.UseWebSockets();

app.MapHub<TaskHub>("/ws");

app.Run();