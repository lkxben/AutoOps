using AuthService.Data;
using AuthService.Entities.User;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.AspNetCore.Identity;
using AuthService.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace AuthService.Proto
{
    public class AuthServiceImp : Auth.AuthBase
	{
		private readonly ILogger<AuthServiceImp> _logger;
        private readonly AuthServiceContext _db;
        private readonly UserManager<User> _userManager;
        private readonly IConfiguration _configuration;
		public AuthServiceImp(ILogger<AuthServiceImp> logger, AuthServiceContext db, UserManager<User> userManager, IConfiguration configuration) 
		{
			_logger = logger;
            _db = db;
            _userManager = userManager;
            _configuration = configuration;
		}

        public override async Task GetAllUsers(
            Google.Protobuf.WellKnownTypes.Empty request,
            IServerStreamWriter<UserModel> responseStream,
            ServerCallContext context)
        {
            var users = await _db.Users.Select(user => user.ToModel()).ToListAsync(); 
            foreach (var user in users)
            {
                await responseStream.WriteAsync(user);
            }
        } 
		
        public override async Task<UserModel> GetUser(GetUserModel request, ServerCallContext context)
        {
            var user = await _db.Users.FindAsync(request.Id);
            if (user == null)
            {
                throw new RpcException(new Status(StatusCode.NotFound, "User not found"));
            }

            return user.ToModel();
        }

        public override async Task<Google.Protobuf.WellKnownTypes.Empty> Register(RegisterModel request, ServerCallContext context)
        {
            var user = new User
            {
                UserName = request.Username,
                Name = request.Name
            };
            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                throw new RpcException(new Status(StatusCode.InvalidArgument, string.Join("; ", result.Errors.Select(e => e.Description))));
            }

            return new Empty();
        }

        public override async Task<JwtModel> Login(LoginModel request, ServerCallContext context)
        {
            var user = await _userManager.FindByNameAsync(request.Username);
            if (user == null || !await _userManager.CheckPasswordAsync(user, request.Password))
                throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid username or password"));

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.UserName!),
                new Claim("name", user.Name)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(int.Parse(_configuration["Jwt:ExpiryMinutes"]!)),
                signingCredentials: creds
            );

            return new JwtModel
            {
                Token = new JwtSecurityTokenHandler().WriteToken(token)
            };
        }
	}
}