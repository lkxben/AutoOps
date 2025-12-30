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

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
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
});

builder.Services.AddGrpcClient<WorkflowTaskSvc.WorkflowTaskSvcClient>(o =>
{
    o.Address = new Uri(builder.Configuration.GetConnectionString("WorkflowTaskService")!);
});

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

app.MapPost("/register", async (RegisterDto registerDto, Auth.AuthClient authClient) =>
{
    await authClient.RegisterAsync(new RegisterModel
    {
        Username = registerDto.Username,
        Name = registerDto.Name,
        Password = registerDto.Password
    });

    return Results.Ok(new { message = "User registered successfully" });
});

app.MapPost("/login", async (LoginDto loginDto, Auth.AuthClient authClient) =>
{
    var jwt = await authClient.LoginAsync(new LoginModel
    {
        Username = loginDto.Username,
        Password = loginDto.Password
    });

    return Results.Ok(new { token = jwt.Token });
});

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
        task.InputData,
        task.Status,
        task.Result
    ));
}).RequireAuthorization();

app.MapPost("/tasks", async (CreateWorkflowTaskDto dto, HttpContext context, WorkflowTaskSvc.WorkflowTaskSvcClient wftClient) =>
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    var result = await wftClient.CreateTaskAsync(new CreateWorkflowTaskModel
    {
        InputData = dto.InputData,
        UserId = userId
    });

    return Results.Ok(new IdDto(result.Id));
}).RequireAuthorization();

app.Run();
