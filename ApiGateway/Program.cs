using AuthService.Protos;
using WorkflowService.Protos;
using Grpc.Net.Client;
using Grpc.Core;
using ApiGateway.Dtos;
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
            context.Token = context.Request.Cookies["auth"];
            return Task.CompletedTask;
        },
        OnChallenge = context =>
        {
            context.HandleResponse();
            context.Response.StatusCode = 401;
            context.Response.ContentType = "application/json";
            return context.Response.WriteAsync("{\"error\": \"Unauthorized\"}");
        }
    };
});

builder.Services.AddAuthorization();

var authServiceUrl = builder.Configuration["Grpc:AuthService"] 
                     ?? throw new Exception("Grpc:AuthService configuration is missing");

var workflowServiceUrl = builder.Configuration["Grpc:WorkflowService"] 
                             ?? throw new Exception("Grpc:WorkflowService configuration is missing");

var schedulerService = builder.Configuration["Grpc:SchedulerService"] 
                             ?? throw new Exception("Grpc:SchedulerService configuration is missing");

var notifServiceUrl = builder.Configuration["NotifServiceUrl"] 
                      ?? throw new Exception("NotifServiceUrl configuration is missing");

builder.Services.AddGrpcClient<Auth.AuthClient>(o =>
{
    o.Address = new Uri(authServiceUrl);
})
.ConfigureChannel(o => o.MaxRetryAttempts = 0)
.AddInterceptor(() => new DeadlineInterceptor(TimeSpan.FromSeconds(1.5)));

builder.Services.AddGrpcClient<WorkflowTaskSvc.WorkflowTaskSvcClient>(o =>
{
    o.Address = new Uri(workflowServiceUrl);
})
.ConfigureChannel(o => o.MaxRetryAttempts = 0)
.AddInterceptor(() => new DeadlineInterceptor(TimeSpan.FromSeconds(1.5)));

builder.Services.AddGrpcClient<WorkflowPlanSvc.WorkflowPlanSvcClient>(o =>
{
    o.Address = new Uri(workflowServiceUrl);
})
.ConfigureChannel(o => o.MaxRetryAttempts = 0)
.AddInterceptor(() => new DeadlineInterceptor(TimeSpan.FromSeconds(1.5)));

builder.Services.AddGrpcClient<RunSvc.RunSvcClient>(o =>
{
    o.Address = new Uri(workflowServiceUrl);
})
.ConfigureChannel(o => o.MaxRetryAttempts = 0)
.AddInterceptor(() => new DeadlineInterceptor(TimeSpan.FromSeconds(1.5)));

builder.Services.AddGrpcClient<ScheduleSvc.ScheduleSvcClient>(o =>
{
    o.Address = new Uri(schedulerServiceUrl);
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

app.UseAuthentication();
app.UseAuthorization(); 

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (RpcException ex)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = ex.StatusCode switch
        {
            StatusCode.NotFound => 404,
            StatusCode.Unauthenticated => 401,
            StatusCode.InvalidArgument => 400,
            StatusCode.AlreadyExists => 409,
            _ => 500
        };
        await context.Response.WriteAsJsonAsync(new { error = ex.Status.Detail });
    }
});

// routes
app.MapGet("/users", async (HttpContext context, Auth.AuthClient authClient) =>
{
    var users = new List<UserDto>();

    using var call = authClient.GetAllUsers(new Google.Protobuf.WellKnownTypes.Empty());

    while (await call.ResponseStream.MoveNext(context.RequestAborted))
    {
        var curr = call.ResponseStream.Current;
        users.Add(new UserDto(curr.Id, curr.Username, curr.Name));
    }

    return Results.Ok(users);
}).RequireAuthorization();

app.MapGet("/auth/me", async (HttpContext context, Auth.AuthClient authClient) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var user = await authClient.GetUserAsync(new GetUserModel { Id = userId });
    return user is null ? Results.NotFound() : Results.Ok(new UserDto
    (
        user.Id,
        user.Username,
        user.Name
    ));
}).RequireAuthorization();

app.MapPost("/register", async (RegisterDto registerDto, Auth.AuthClient authClient, HttpContext context) =>
{
    var response = await authClient.RegisterAsync(new RegisterModel
    {
        Username = registerDto.Username,
        Name = registerDto.Name,
        Password = registerDto.Password
    });

    context.Response.Cookies.Append(
        "auth",
        response.Token,
        new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        }
    );

    return Results.Ok(
        new UserDto(
            response.User.Id,
            response.User.Username,
            response.User.Name
        )
    );
});

app.MapPost("/login", async (LoginDto loginDto, Auth.AuthClient authClient, HttpContext context) =>
{
    var response = await authClient.LoginAsync(new LoginModel
    {
        Username = loginDto.Username,
        Password = loginDto.Password
    });

    context.Response.Cookies.Append(
        "auth",
        response.Token,
        new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        }
    );

    return Results.Ok(
        new UserDto(
            response.User.Id,
            response.User.Username,
            response.User.Name
        )
    );
});

app.MapPost("/logout", (HttpContext context) =>
{
    context.Response.Cookies.Delete("auth");
    return Results.Ok();
});

app.MapGet("/tasks", async (HttpContext context, WorkflowTaskSvc.WorkflowTaskSvcClient wftClient) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var response = await wftClient.GetUserTasksAsync(new GetUserTasksModel 
    { 
        UserId = userId
    });

    var tasksDto = response.Tasks.Select(task => new WorkflowTaskDto
    (
        task.Id,
        task.UserId,
        task.Title,
        task.Prompt,
        task.Status,
        task.Result,
        task.CreatedAt.ToDateTime(),
        task.UpdatedAt?.ToDateTime()
    ));

    return Results.Ok(tasksDto);
}).RequireAuthorization();

app.MapGet("/tasks/{id}", async (string id, HttpContext context, WorkflowTaskSvc.WorkflowTaskSvcClient wftClient) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var task = await wftClient.GetTaskAsync(new GetWorkflowTaskModel { 
        Id = id,
        UserId = userId
    });
    
    return task is null ? Results.NotFound() : Results.Ok(new WorkflowTaskDto
    (
        task.Id,
        task.UserId,
        task.Title,
        task.Prompt,
        task.Status,
        task.Result,
        task.CreatedAt.ToDateTime(),
        task.UpdatedAt?.ToDateTime()
    ));
}).RequireAuthorization();

app.MapPost("/tasks", async (CreateWorkflowTaskDto dto, HttpContext context, WorkflowTaskSvc.WorkflowTaskSvcClient wftClient) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var result = await wftClient.CreateTaskAsync(new CreateWorkflowTaskModel
    {
        UserId = userId,
        Title = dto.Title,
        Prompt = dto.Prompt
    });

    return Results.Ok(new IdDto(result.Id));
}).RequireAuthorization();

app.MapGet("/plans", async (string taskId, HttpContext context, WorkflowPlanSvc.WorkflowPlanSvcClient wfpClient) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var plan = await wfpClient.GetPlanByTaskIdAsync(new GetPlanByTaskIdModel
    {
        UserId = userId,
        TaskId = taskId
    });

    if (plan is null)
        return Results.NotFound();

    return Results.Ok(new WorkflowPlanDto(
        plan.Id,
        plan.TaskId,
        plan.Graph,
        plan.CreatedAt.ToDateTime(),
        plan.UpdatedAt?.ToDateTime()
    ));
}).RequireAuthorization();

app.MapPut("/plans", async (CreateWorkflowPlanDto dto, HttpContext context, WorkflowPlanSvc.WorkflowPlanSvcClient wfpClient) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var result = await wfpClient.SavePlanAsync(new CreateWorkflowPlanModel
    {
        UserId = userId,
        TaskId = dto.TaskId,
        Graph = dto.Graph.GetRawText()
    });

    return Results.Ok(new IdDto(result.Id));
}).RequireAuthorization();

app.MapPost("/runs", async (CreateRunDto dto, HttpContext context, RunSvc.RunSvcClient runClient) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var result = await runClient.CreateRunAsync(new CreateRunModel
    {
        UserId = userId,
        TaskId = dto.TaskId,
    });

    return Results.Ok(new IdDto(result.Id));
}).RequireAuthorization();

app.MapGet("/runs", async (HttpContext context, RunSvc.RunSvcClient runClient) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var response = await runClient.GetUserRunsAsync(new GetUserRunsModel
    {
        UserId = userId
    });

    var runsDto = response.Runs.Select(run => new RunDto
    (
        run.Id,
        run.UserId,
        run.TaskId,
        run.PlanId,
        run.Status,
        run.Result,
        run.CreatedAt.ToDateTime(),
        run.UpdatedAt?.ToDateTime()
    ));

    return Results.Ok(runsDto);
}).RequireAuthorization();

app.MapPost("/notifications/channels", async (AddChannelDto dto, HttpContext context, IHttpClientFactory httpFactory) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var client = httpFactory.CreateClient();
    var payload = new
    {
        user_id = userId,
        channel = dto.Channel,
        address = dto.Address
    };
    var resp = await client.PostAsJsonAsync($"{notifServiceUrl}/notifications/channels", payload);
    return resp.IsSuccessStatusCode ? Results.Created("", null) : Results.StatusCode((int)resp.StatusCode);
}).RequireAuthorization();

app.MapPut("/notifications/channels/{channel}", async (string channel, UpdateChannelDto dto, HttpContext context, IHttpClientFactory httpFactory) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var client = httpFactory.CreateClient();
    var payload = new { user_id = userId, address = dto.Address };
    var resp = await client.PutAsJsonAsync($"{notifServiceUrl}/notifications/channels/{channel}", payload);
    return resp.IsSuccessStatusCode ? Results.Ok() : Results.StatusCode((int)resp.StatusCode);
}).RequireAuthorization();

app.MapDelete("/notifications/channels/{channel}", async (string channel, HttpContext context, IHttpClientFactory httpFactory) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var client = httpFactory.CreateClient();
    var req = new HttpRequestMessage(HttpMethod.Delete, $"{notifServiceUrl}/notifications/channels/{channel}")
    {
        Content = JsonContent.Create(new { user_id = userId })
    };
    var resp = await client.SendAsync(req);
    return resp.IsSuccessStatusCode ? Results.NoContent() : Results.StatusCode((int)resp.StatusCode);
}).RequireAuthorization();

app.MapGet("/notifications/channels", async (HttpContext context, IHttpClientFactory httpFactory) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var client = httpFactory.CreateClient();
    var req = new HttpRequestMessage(HttpMethod.Get, $"{notifServiceUrl}/notifications/channels")
    {
        Content = JsonContent.Create(new { user_id = userId })
    };
    var resp = await client.SendAsync(req);
    if (!resp.IsSuccessStatusCode) return Results.StatusCode((int)resp.StatusCode);

    var channels = await resp.Content.ReadFromJsonAsync<List<ChannelResponseDto>>();
    return Results.Ok(channels);
}).RequireAuthorization();

app.MapGet("/health", () => Results.Ok());
app.Run();