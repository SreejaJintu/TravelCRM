using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelCRM.Api.DTOs.Bookings;
using TravelCRM.Api.Models;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public sealed class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedBookingsResponseDto<BookingSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedBookingsResponseDto<BookingSummaryDto>>> GetBookings(
        [FromQuery, StringLength(100)] string? search = null,
        [FromQuery, StringLength(20)] string? status = null,
        [FromQuery] DateOnly? travelStartFrom = null,
        [FromQuery] DateOnly? travelStartTo = null,
        [FromQuery, Range(1, int.MaxValue)] int? customerId = null,
        [FromQuery, Range(1, int.MaxValue)] int? travelPackageId = null,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        try
        {
            var result = await _bookingService.GetPagedAsync(
                userId,
                User.IsInRole("Admin"),
                search,
                status,
                travelStartFrom,
                travelStartTo,
                page,
                pageSize,
                customerId,
                travelPackageId,
                cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: exception.Message));
        }
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(BookingDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BookingDetailsDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        var booking = await _bookingService.GetByIdAsync(
            id, userId, User.IsInRole("Admin"), cancellationToken);
        return booking is null ? BookingNotFound() : Ok(booking);
    }

    [HttpPost]
    [ProducesResponseType(typeof(BookingDetailsDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<BookingDetailsDto>> Create(
        CreateBookingRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        var result = await _bookingService.CreateAsync(
            userId, User.IsInRole("Admin"), request, cancellationToken);
        return result.Status == BookingOperationStatus.Success
            ? CreatedAtAction(nameof(GetById), new { id = result.Value!.BookingId }, result.Value)
            : MapFailure(result.Status);
    }

    [HttpPost("from-lead/{leadId:int}")]
    [ProducesResponseType(typeof(BookingDetailsDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<BookingDetailsDto>> CreateFromLead(
        int leadId,
        CreateBookingFromLeadRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        var result = await _bookingService.CreateFromLeadAsync(
            leadId, userId, User.IsInRole("Admin"), request, cancellationToken);
        return result.Status == BookingOperationStatus.Success
            ? CreatedAtAction(nameof(GetById), new { id = result.Value!.BookingId }, result.Value)
            : MapFailure(result.Status);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(BookingDetailsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<BookingDetailsDto>> Update(
        int id,
        UpdateBookingRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        var result = await _bookingService.UpdateAsync(
            id, userId, User.IsInRole("Admin"), request, cancellationToken);
        return result.Status == BookingOperationStatus.Success
            ? Ok(result.Value)
            : MapFailure(result.Status);
    }

    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(BookingDetailsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<BookingDetailsDto>> ChangeStatus(
        int id,
        ChangeBookingStatusRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        var result = await _bookingService.ChangeStatusAsync(
            id, userId, User.IsInRole("Admin"), request.Status, cancellationToken);
        return result.Status == BookingOperationStatus.Success
            ? Ok(result.Value)
            : MapFailure(result.Status);
    }

    [HttpPatch("{id:int}/cancel")]
    [ProducesResponseType(typeof(BookingDetailsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<BookingDetailsDto>> Cancel(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        var result = await _bookingService.ChangeStatusAsync(
            id, userId, User.IsInRole("Admin"), BookingStatuses.Cancelled, cancellationToken);
        return result.Status == BookingOperationStatus.Success
            ? Ok(result.Value)
            : MapFailure(result.Status);
    }

    [HttpPatch("{id:int}/assignment")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(BookingDetailsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<BookingDetailsDto>> Assign(
        int id,
        AssignBookingRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _bookingService.AssignAsync(id, request.AssignedToUserId, cancellationToken);
        return result.Status == BookingOperationStatus.Success
            ? Ok(result.Value)
            : MapFailure(result.Status);
    }

    [HttpGet("assignable-staff")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IReadOnlyList<AssignableBookingStaffResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AssignableBookingStaffResponseDto>>> GetAssignableStaff(
        CancellationToken cancellationToken) =>
        Ok(await _bookingService.GetAssignableStaffAsync(cancellationToken));

    [HttpGet("customer/{customerId:int}")]
    [ProducesResponseType(typeof(PagedBookingsResponseDto<BookingSummaryDto>), StatusCodes.Status200OK)]
    public Task<ActionResult<PagedBookingsResponseDto<BookingSummaryDto>>> GetByCustomer(
        int customerId,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 10,
        CancellationToken cancellationToken = default) =>
        GetRelatedBookings(customerId, null, page, pageSize, cancellationToken);

    [HttpGet("package/{travelPackageId:int}")]
    [ProducesResponseType(typeof(PagedBookingsResponseDto<BookingSummaryDto>), StatusCodes.Status200OK)]
    public Task<ActionResult<PagedBookingsResponseDto<BookingSummaryDto>>> GetByPackage(
        int travelPackageId,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 10,
        CancellationToken cancellationToken = default) =>
        GetRelatedBookings(null, travelPackageId, page, pageSize, cancellationToken);

    private async Task<ActionResult<PagedBookingsResponseDto<BookingSummaryDto>>> GetRelatedBookings(
        int? customerId,
        int? travelPackageId,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        var result = await _bookingService.GetPagedAsync(
            userId,
            User.IsInRole("Admin"),
            null,
            null,
            null,
            null,
            page,
            pageSize,
            customerId,
            travelPackageId,
            cancellationToken);
        return Ok(result);
    }

    private ActionResult<BookingDetailsDto> MapFailure(BookingOperationStatus status) =>
        status switch
        {
            BookingOperationStatus.NotFound => BookingNotFound(),
            BookingOperationStatus.InvalidCustomer => NotFound(Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "An active customer accessible to the current user is required.")),
            BookingOperationStatus.InvalidPackage => NotFound(Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "An active travel package is required.")),
            BookingOperationStatus.InvalidLead => Conflict(Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "The lead is inactive, lost, or cannot be converted in its current state.")),
            BookingOperationStatus.InvalidAssignee => BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Only an active Staff account can be assigned to a booking.")),
            BookingOperationStatus.InvalidTravelers => BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Traveler details must match the booking's traveler counts.")),
            BookingOperationStatus.EmailRequired => BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "The lead needs an email before a new customer can be created.")),
            BookingOperationStatus.AmbiguousCustomer => Conflict(Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "The lead's email and phone match different customers. Resolve the match first.")),
            BookingOperationStatus.InvalidState => BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "The booking data is invalid or the requested status transition is not allowed.")),
            BookingOperationStatus.Conflict => Conflict(Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "The booking conflicts with its current state.")),
            _ => BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "The booking request is invalid."))
        };

    private NotFoundObjectResult BookingNotFound() =>
        NotFound(Problem(statusCode: StatusCodes.Status404NotFound, title: "Booking not found."));

    private UnauthorizedObjectResult InvalidUser() =>
        Unauthorized(Problem(
            statusCode: StatusCodes.Status401Unauthorized,
            title: "A valid user identity is required."));

    private bool TryGetUserId(out int userId) =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
}
