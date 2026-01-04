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

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var key = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!);
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
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
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

builder.Services.AddGrpcClient<Auth.AuthClient>(o =>
{
    o.Address = new Uri(builder.Configuration.GetConnectionString("AuthService")!);
})
.ConfigureChannel(o =>
{
    o.MaxRetryAttempts = 0;
})
.AddInterceptor(() => new DeadlineInterceptor(TimeSpan.FromSeconds(1)));

builder.Services.AddGrpcClient<WorkflowTaskSvc.WorkflowTaskSvcClient>(o =>
{
    o.Address = new Uri(builder.Configuration.GetConnectionString("WorkflowTaskService")!);
})
.ConfigureChannel(o =>
{
    o.MaxRetryAttempts = 0;
})
.AddInterceptor(() => new DeadlineInterceptor(TimeSpan.FromSeconds(1)));

builder.Services.AddGrpcClient<WorkflowPlanSvc.WorkflowPlanSvcClient>(o =>
{
    o.Address = new Uri(builder.Configuration.GetConnectionString("WorkflowTaskService")!);
})
.ConfigureChannel(o =>
{
    o.MaxRetryAttempts = 0;
})
.AddInterceptor(() => new DeadlineInterceptor(TimeSpan.FromSeconds(1)));

var app = builder.Build();

app.UseCors("AllowFrontend");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

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
app.MapGet("/users", async (HttpContext http, Auth.AuthClient authClient) =>
{
    var users = new List<UserDto>();

    using var call = authClient.GetAllUsers(new Google.Protobuf.WellKnownTypes.Empty());

    while (await call.ResponseStream.MoveNext(http.RequestAborted))
    {
        var curr = call.ResponseStream.Current;
        users.Add(new UserDto(curr.Id, curr.Username, curr.Name));
    }

    return Results.Ok(users);
}).RequireAuthorization();

app.MapGet("/users/{id}", async (string id, Auth.AuthClient authClient) =>
{
    var user = await authClient.GetUserAsync(new GetUserModel { Id = id });
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
            Secure = false,
            SameSite = SameSiteMode.Lax,
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
            Secure = false,
            SameSite = SameSiteMode.Lax,
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

app.MapGet("/tasks", async (HttpContext context, WorkflowTaskSvc.WorkflowTaskSvcClient wftClient) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var response = await wftClient.GetUserTasksAsync(new GetUserTasksModel 
    { 
        UserId = userId
    });

    if (response == null || response.Tasks.Count == 0)
        return Results.NotFound();

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

app.Run();
