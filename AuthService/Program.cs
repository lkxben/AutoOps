using AuthService.Data;
using AuthService.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using AuthService.Protos;
using Microsoft.AspNetCore.Server.Kestrel.Core;

var builder = WebApplication.CreateBuilder(args);

var grpcPort = builder.Configuration.GetValue<int>("Grpc:Port", 5002);
var dbConnection = builder.Configuration.GetConnectionString("AuthServiceDb") 
                   ?? throw new Exception("AuthServiceDb connection string is missing");
var schema = builder.Configuration["DatabaseSchema"] ?? "auth";

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(grpcPort, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http2;
    });
});

builder.Services.AddDbContext<AuthServiceContext>(options =>
{
    options.UseNpgsql(dbConnection, npgsqlOptions =>
        npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", schema));
});

builder.Services.AddIdentity<User, IdentityRole<Guid>>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
    options.Password.RequiredLength = 6;
})
.AddEntityFrameworkStores<AuthServiceContext>()
.AddDefaultTokenProviders();
builder.Services.AddGrpc();

var app = builder.Build();

app.MapGrpcService<AuthServiceImp>();
app.MapGet("/health", () => Results.Ok());

app.Run();