using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using TravelCRM.Api.DTOs;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;

    public AuthService(
        IUserRepository userRepository,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _configuration = configuration;
    }

    public async Task<AuthResultDto> RegisterAsync(RegisterRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return Failure(
                400,
                "Full name, email, and password are required.");
        }

        if (request.Password.Length < 8)
        {
            return Failure(
                400,
                "Password must contain at least 8 characters.");
        }

        var email = request.Email.Trim().ToLowerInvariant();

        if (await _userRepository.EmailExistsAsync(email))
        {
            return Failure(409, "Email already registered.");
        }

        if (!await _userRepository.RoleExistsAsync(request.RoleId))
        {
            return Failure(400, "Invalid role.");
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = request.RoleId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        return new AuthResultDto
        {
            Success = true,
            StatusCode = 200,
            Message = "User registered successfully.",
            User = new AuthUserDto
            {
                UserId = user.UserId,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.RoleId == 1 ? "Admin" : "Staff"
            }
        };
    }

    public async Task<AuthResultDto> LoginAsync(LoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return Failure(400, "Email and password are required.");
        }

        var email = request.Email.Trim().ToLowerInvariant();

        var user = await _userRepository.GetByEmailAsync(email);

        if (user == null ||
            !BCrypt.Net.BCrypt.Verify(
                request.Password,
                user.PasswordHash))
        {
            return Failure(401, "Invalid email or password.");
        }

        if (!user.IsActive)
        {
            return Failure(401, "This account is inactive.");
        }

        var jwtKey = _configuration["Jwt:Key"];
        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];

        if (string.IsNullOrWhiteSpace(jwtKey))
        {
            throw new InvalidOperationException(
                "JWT Key is missing from configuration.");
        }

        var expiryMinutes = int.TryParse(
            _configuration["Jwt:ExpiryMinutes"],
            out var configuredExpiry)
                ? configuredExpiry
                : 60;

        var claims = new List<Claim>
        {
            new Claim(
                ClaimTypes.NameIdentifier,
                user.UserId.ToString()),

            new Claim(ClaimTypes.Name, user.FullName),

            new Claim(ClaimTypes.Email, user.Email),

            new Claim(ClaimTypes.Role, user.Role.RoleName)
        };

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey));

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256);

        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        var tokenString = new JwtSecurityTokenHandler()
            .WriteToken(token);

        return new AuthResultDto
        {
            Success = true,
            StatusCode = 200,
            Message = "Login successful.",
            Token = tokenString,
            ExpiresInMinutes = expiryMinutes,
            User = new AuthUserDto
            {
                UserId = user.UserId,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role.RoleName
            }
        };
    }

    private static AuthResultDto Failure(
        int statusCode,
        string message)
    {
        return new AuthResultDto
        {
            Success = false,
            StatusCode = statusCode,
            Message = message
        };
    }
}
