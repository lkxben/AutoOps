using EventService.Consumers;
using EventService.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

var frontendUrls = builder.Configuration["Frontend__Urls"]?
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(frontendUrls)
            .SetIsOriginAllowed(origin =>
            {
                foreach (var url in frontendUrls)
                {
                    if (url.Contains("*"))
                    {
                        var regexPattern = "^" + Regex.Escape(url).Replace("\\*", ".*") + "$";
                        if (Regex.IsMatch(origin, regexPattern, RegexOptions.IgnoreCase))
                            return true;
                    }
                }
                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.Configure<RabbitMQSettings>(
    builder.Configuration.GetSection("RabbitMQSettings"));

builder.Services.AddSingleton(sp =>
    sp.GetRequiredService<IOptions<RabbitMQSettings>>().Value);

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
builder.Services.AddHostedService<TaskUpdatedConsumer>();
builder.Services.AddHostedService<PlanDraftConsumer>();

var app = builder.Build();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.UseWebSockets();

app.MapHub<TaskHub>("/ws");

app.Run();