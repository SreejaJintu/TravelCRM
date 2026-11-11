using TravelCRM.Api.DTOs;

namespace TravelCRM.Api.Services.Interfaces;

public interface IAuthService
{
    Task<AuthResultDto> RegisterAsync(RegisterRequestDto request);

    Task<AuthResultDto> LoginAsync(LoginRequestDto request);
}
