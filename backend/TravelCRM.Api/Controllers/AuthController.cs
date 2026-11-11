using Microsoft.AspNetCore.Mvc;
using TravelCRM.Api.DTOs;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(
        RegisterRequestDto request)
    {
        var result = await _authService.RegisterAsync(request);

        return StatusCode(result.StatusCode, result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        LoginRequestDto request)
    {
        var result = await _authService.LoginAsync(request);

        return StatusCode(result.StatusCode, result);
    }
}
