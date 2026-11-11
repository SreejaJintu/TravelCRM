namespace TravelCRM.Api.DTOs;

public class AuthResultDto
{
    public bool Success { get; set; }

    public int StatusCode { get; set; }

    public string Message { get; set; } = string.Empty;

    public string? Token { get; set; }

    public int? ExpiresInMinutes { get; set; }

    public AuthUserDto? User { get; set; }
}
