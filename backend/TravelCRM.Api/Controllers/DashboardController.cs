using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelCRM.Api.DTOs.Dashboard;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public sealed class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    /// <summary>Gets accessible dashboard statistics, chart series, and recent activity.</summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(DashboardSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null,
        CancellationToken cancellationToken = default)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized(Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "A valid user identity is required."));
        }

        try
        {
            return Ok(await _dashboardService.GetSummaryAsync(
                userId,
                User.IsInRole("Admin"),
                fromDate,
                toDate,
                cancellationToken));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: exception.Message));
        }
    }
}
