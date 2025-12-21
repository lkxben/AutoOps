using AuthService.Data;
using AuthService.Dtos;
using AuthService.Extensions;
using AuthService.Entities.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

var builder = WebApplication.CreateBuilder(args);

// services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<AuthServiceContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("LocalConnection")));
builder.Services.AddIdentity<User, Role>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
    options.Password.RequiredLength = 6;
})
.AddEntityFrameworkStores<AuthServiceContext>()
.AddDefaultTokenProviders();

var app = builder.Build();

// routes
app.MapGet("/users", async (AuthServiceContext db) =>
{
   var users = await db.Users.Select(user => user.ToDto()).ToListAsync(); 
   return Results.Ok(users);
});

app.MapGet("/users/{id:int}", async (int id, AuthServiceContext db) =>
{
    var user = await db.Users.FindAsync(id);
    return user is null ? Results.NotFound() : Results.Ok(user.ToDto());
});

app.MapPost("/register", async (RegisterDto registerDto, UserManager<User> userManager) =>
{
   var user = new User
   {
       UserName = registerDto.Username,
       Name = registerDto.Name
   };
   
    var result = await userManager.CreateAsync(user, registerDto.Password);
    return result.Succeeded ? Results.Ok("User created") : Results.BadRequest(result.Errors);
});

app.MapPost("/login", async (LoginDto loginDto, SignInManager<User> signInManager) =>
{
    var result = await signInManager.PasswordSignInAsync(loginDto.Username, loginDto.Password, isPersistent: false, lockoutOnFailure: false);
    return result.Succeeded ? Results.Ok("Login successful") : Results.Unauthorized();
});

app.Run();