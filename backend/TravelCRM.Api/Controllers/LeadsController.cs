using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelCRM.Api.DTOs.Leads;
using TravelCRM.Api.Models;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public sealed class LeadsController : ControllerBase
{
    private readonly ILeadService _leadService;

    public LeadsController(ILeadService leadService)
    {
        _leadService = leadService;
    }

    /// <summary>Gets a paginated lead list scoped to the current user unless they are an Admin.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedLeadsResponseDto<LeadResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedLeadsResponseDto<LeadResponseDto>>> GetLeads(
        [FromQuery, StringLength(150)] string? search = null,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var result = await _leadService.GetLeadsAsync(
            userId,
            User.IsInRole("Admin"),
            search,
            page,
            pageSize,
            cancellationToken);

        return Ok(result);
    }

    /// <summary>Gets the active Staff accounts that an Admin can assign leads to.</summary>
    [HttpGet("assignable-staff")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IReadOnlyList<AssignableStaffResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AssignableStaffResponseDto>>> GetAssignableStaff(
        CancellationToken cancellationToken)
    {
        var staff = await _leadService.GetAssignableStaffAsync(cancellationToken);
        return Ok(staff);
    }

    /// <summary>Gets one lead if the current user created it, is assigned to it, or is an Admin.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(LeadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LeadResponseDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var lead = await _leadService.GetByIdAsync(
            id,
            userId,
            User.IsInRole("Admin"),
            cancellationToken);

        return lead is null
            ? NotFound(Problem(statusCode: StatusCodes.Status404NotFound, title: "Lead not found."))
            : Ok(lead);
    }

    /// <summary>Creates a lead owned by the authenticated user.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(LeadResponseDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<LeadResponseDto>> Create(
        CreateLeadRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var lead = await _leadService.CreateAsync(userId, request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = lead.LeadId }, lead);
    }

    /// <summary>Updates editable lead details without changing ownership or status.</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(LeadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<LeadResponseDto>> Update(
        int id,
        UpdateLeadRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var result = await _leadService.UpdateAsync(
            id,
            userId,
            User.IsInRole("Admin"),
            request,
            cancellationToken);

        return MapLeadResult(result);
    }

    /// <summary>Changes a lead status. Conversion must use the dedicated conversion endpoint.</summary>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(LeadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<LeadResponseDto>> ChangeStatus(
        int id,
        ChangeLeadStatusRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var result = await _leadService.ChangeStatusAsync(
            id,
            userId,
            User.IsInRole("Admin"),
            request.Status,
            cancellationToken);

        return MapLeadResult(result);
    }

    /// <summary>Assigns a lead to active Staff, or clears its assignment. Admin only.</summary>
    [HttpPatch("{id:int}/assignment")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(LeadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LeadResponseDto>> Assign(
        int id,
        AssignLeadRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var result = await _leadService.AssignAsync(
            id,
            request.AssignedToUserId,
            userId,
            true,
            cancellationToken);

        return MapLeadResult(result);
    }

    /// <summary>Deactivates a lead without deleting its history.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Deactivate(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var result = await _leadService.SetActiveAsync(
            id,
            userId,
            User.IsInRole("Admin"),
            false,
            cancellationToken);

        return result.Status == LeadOperationStatus.NotFound
            ? LeadNotFound()
            : NoContent();
    }

    /// <summary>Reactivates an inactive lead.</summary>
    [HttpPatch("{id:int}/activate")]
    [ProducesResponseType(typeof(LeadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LeadResponseDto>> Activate(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var result = await _leadService.SetActiveAsync(
            id,
            userId,
            User.IsInRole("Admin"),
            true,
            cancellationToken);

        return MapLeadResult(result);
    }

    /// <summary>Converts a lead to a new or matching customer while retaining the lead record.</summary>
    [HttpPost("{id:int}/convert")]
    [ProducesResponseType(typeof(LeadConversionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<LeadConversionResponseDto>> Convert(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();

        var result = await _leadService.ConvertAsync(
            id,
            userId,
            userId,
            User.IsInRole("Admin"),
            cancellationToken);

        if (result.Status == LeadOperationStatus.NotFound) return LeadNotFound();
        if (result.Status == LeadOperationStatus.EmailRequired)
        {
            return BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "An email is required to create a Customer when no matching phone record exists."));
        }
        if (result.Status == LeadOperationStatus.AmbiguousCustomer)
        {
            return Conflict(Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "The lead's email and phone match different customers. Resolve the match before converting."));
        }
        if (result.Status == LeadOperationStatus.Conflict)
        {
            return Conflict(Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "This lead cannot be converted in its current state."));
        }

        return Ok(result.Value);
    }

    private ActionResult<LeadResponseDto> MapLeadResult(LeadOperationResult<LeadResponseDto> result)
    {
        return result.Status switch
        {
            LeadOperationStatus.NotFound => LeadNotFound(),
            LeadOperationStatus.InvalidAssignee => BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Only an active Staff account can be assigned to a lead.")),
            LeadOperationStatus.Conflict => Conflict(Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "The lead cannot be changed in its current state.")),
            _ => Ok(result.Value)
        };
    }

    private NotFoundObjectResult LeadNotFound()
    {
        return NotFound(Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: "Lead not found."));
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