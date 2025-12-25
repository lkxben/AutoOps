using AuthService.Data;
using AuthService.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using AuthService.Protos;
using Microsoft.AspNetCore.Server.Kestrel.Core;

var builder = WebApplication.CreateBuilder(args);

// services
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(7254, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http2;
        listenOptions.UseHttps();
    });
});


builder.Services.AddEndpointsApiExplorer();
builder.Services.AddDbContext<AuthServiceContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("LocalConnection")));
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