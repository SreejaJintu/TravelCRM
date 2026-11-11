using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelCRM.Api.DTOs.FollowUps;
using TravelCRM.Api.Models;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public sealed class FollowUpsController : ControllerBase
{
    private readonly IFollowUpService _followUpService;

    public FollowUpsController(IFollowUpService followUpService)
    {
        _followUpService = followUpService;
    }

    /// <summary>Gets a paginated, filtered list of accessible follow-ups.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedFollowUpsResponseDto<FollowUpResponseDto>), StatusCodes.Status200OK)]
    public Task<ActionResult<PagedFollowUpsResponseDto<FollowUpResponseDto>>> GetFollowUps(
        [FromQuery, StringLength(150)] string? search = null,
        [FromQuery] int? leadId = null,
        [FromQuery] int? assignedToUserId = null,
        [FromQuery, StringLength(20)] string? status = null,
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        return GetPage(FollowUpWindow.All, search, leadId, assignedToUserId, status, from, to, page, pageSize, cancellationToken);
    }

    /// <summary>Gets follow-ups scheduled today in UTC.</summary>
    [HttpGet("today")]
    [ProducesResponseType(typeof(PagedFollowUpsResponseDto<FollowUpResponseDto>), StatusCodes.Status200OK)]
    public Task<ActionResult<PagedFollowUpsResponseDto<FollowUpResponseDto>>> GetToday(
        [FromQuery, StringLength(150)] string? search = null,
        [FromQuery] int? leadId = null,
        [FromQuery] int? assignedToUserId = null,
        [FromQuery, StringLength(20)] string? status = null,
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        return GetPage(FollowUpWindow.Today, search, leadId, assignedToUserId, status, from, to, page, pageSize, cancellationToken);
    }

    /// <summary>Gets pending follow-ups scheduled before the current UTC time.</summary>
    [HttpGet("overdue")]
    [ProducesResponseType(typeof(PagedFollowUpsResponseDto<FollowUpResponseDto>), StatusCodes.Status200OK)]
    public Task<ActionResult<PagedFollowUpsResponseDto<FollowUpResponseDto>>> GetOverdue(
        [FromQuery, StringLength(150)] string? search = null,
        [FromQuery] int? leadId = null,
        [FromQuery] int? assignedToUserId = null,
        [FromQuery, StringLength(20)] string? status = null,
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        return GetPage(FollowUpWindow.Overdue, search, leadId, assignedToUserId, status, from, to, page, pageSize, cancellationToken);
    }

    /// <summary>Gets pending follow-ups scheduled now or later.</summary>
    [HttpGet("upcoming")]
    [ProducesResponseType(typeof(PagedFollowUpsResponseDto<FollowUpResponseDto>), StatusCodes.Status200OK)]
    public Task<ActionResult<PagedFollowUpsResponseDto<FollowUpResponseDto>>> GetUpcoming(
        [FromQuery, StringLength(150)] string? search = null,
        [FromQuery] int? leadId = null,
        [FromQuery] int? assignedToUserId = null,
        [FromQuery, StringLength(20)] string? status = null,
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        return GetPage(FollowUpWindow.Upcoming, search, leadId, assignedToUserId, status, from, to, page, pageSize, cancellationToken);
    }

    /// <summary>Gets active Staff accounts available for follow-up assignment.</summary>
    [HttpGet("assignable-staff")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IReadOnlyList<FollowUpAssignableStaffResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<FollowUpAssignableStaffResponseDto>>> GetAssignableStaff(
        CancellationToken cancellationToken)
    {
        return Ok(await _followUpService.GetAssignableStaffAsync(cancellationToken));
    }

    /// <summary>Gets one follow-up accessible to the current user.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(FollowUpResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FollowUpResponseDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var followUp = await _followUpService.GetByIdAsync(
            id,
            userId,
            User.IsInRole("Admin"),
            cancellationToken);

        return followUp is null ? FollowUpNotFound() : Ok(followUp);
    }

    /// <summary>Schedules a follow-up on an accessible lead.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(FollowUpResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FollowUpResponseDto>> Create(
        CreateFollowUpRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var result = await _followUpService.CreateAsync(
            userId,
            User.IsInRole("Admin"),
            request,
            cancellationToken);

        if (result.Status != FollowUpOperationStatus.Success)
        {
            return MapFollowUpResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Value!.FollowUpId }, result.Value);
    }

    /// <summary>Updates the linked lead, schedule, type, and description of a pending follow-up.</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(FollowUpResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FollowUpResponseDto>> Update(
        int id,
        UpdateFollowUpRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var result = await _followUpService.UpdateAsync(
            id,
            userId,
            User.IsInRole("Admin"),
            request,
            cancellationToken);

        return MapFollowUpResult(result);
    }

    /// <summary>Reassigns a pending follow-up to an active Staff account. Admin only.</summary>
    [HttpPatch("{id:int}/assignment")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(FollowUpResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FollowUpResponseDto>> Assign(
        int id,
        AssignFollowUpRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var result = await _followUpService.AssignAsync(
            id,
            request.AssignedToUserId,
            userId,
            true,
            cancellationToken);

        return MapFollowUpResult(result);
    }

    /// <summary>Completes a pending follow-up and records its outcome.</summary>
    [HttpPatch("{id:int}/complete")]
    [ProducesResponseType(typeof(FollowUpResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FollowUpResponseDto>> Complete(
        int id,
        CompleteFollowUpRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var result = await _followUpService.CompleteAsync(
            id,
            userId,
            User.IsInRole("Admin"),
            request.Outcome,
            cancellationToken);

        return MapFollowUpResult(result);
    }

    /// <summary>Cancels a pending follow-up.</summary>
    [HttpPatch("{id:int}/cancel")]
    [ProducesResponseType(typeof(FollowUpResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FollowUpResponseDto>> Cancel(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var result = await _followUpService.CancelAsync(
            id,
            userId,
            User.IsInRole("Admin"),
            cancellationToken);

        return MapFollowUpResult(result);
    }

    private async Task<ActionResult<PagedFollowUpsResponseDto<FollowUpResponseDto>>> GetPage(
        FollowUpWindow window,
        string? search,
        int? leadId,
        int? assignedToUserId,
        string? status,
        DateTimeOffset? from,
        DateTimeOffset? to,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        if (!string.IsNullOrWhiteSpace(status) && !FollowUpStatuses.IsValid(status))
        {
            return BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid follow-up status."));
        }

        if (from.HasValue && to.HasValue && from.Value > to.Value)
        {
            return BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "The from date must be on or before the to date."));
        }

        if (!User.IsInRole("Admin") && assignedToUserId.HasValue && assignedToUserId.Value != userId)
        {
            return Forbid();
        }

        var result = await _followUpService.GetFollowUpsAsync(
            userId,
            User.IsInRole("Admin"),
            search,
            leadId,
            assignedToUserId,
            status,
            from,
            to,
            window,
            page,
            pageSize,
            cancellationToken);

        return Ok(result);
    }

    private ActionResult<FollowUpResponseDto> MapFollowUpResult(
        FollowUpOperationResult<FollowUpResponseDto> result)
    {
        return result.Status switch
        {
            FollowUpOperationStatus.NotFound or FollowUpOperationStatus.InvalidLead => FollowUpNotFound(),
            FollowUpOperationStatus.Forbidden => Forbid(),
            FollowUpOperationStatus.InvalidAssignee => BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Only an active Staff account can be assigned.")),
            FollowUpOperationStatus.Conflict => Conflict(Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "The follow-up cannot be changed in its current state.")),
            _ => Ok(result.Value)
        };
    }

    private NotFoundObjectResult FollowUpNotFound()
    {
        return NotFound(Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: "Follow-up or accessible lead not found."));
    }

    private UnauthorizedObjectResult InvalidUser()
    {
        return Unauthorized(Problem(
            statusCode: StatusCodes.Status401Unauthorized,
            title: "A valid user identity is required."));
    }

    private bool TryGetUserId(out int userId)
    {
        return int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
    }
}