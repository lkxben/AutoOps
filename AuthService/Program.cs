using AuthService.Data;
using AuthService.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using AuthService.Protos;
using Microsoft.AspNetCore.Server.Kestrel.Core;

var builder = WebApplication.CreateBuilder(args);

var grpcPort = builder.Configuration.GetValue<int?>("Grpc:Port") ?? 4002;
var dbConnection = builder.Configuration.GetConnectionString("AuthServiceDb") 
                   ?? throw new Exception("AuthServiceDb connection string is missing");

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(grpcPort, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http2;
    });
});

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddDbContext<AuthServiceContext>(options =>
    options.UseNpgsql(dbConnection));

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
app.Run();