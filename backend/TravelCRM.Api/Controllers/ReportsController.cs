using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelCRM.Api.DTOs.Reports;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public sealed class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("bookings")]
    [ProducesResponseType(typeof(BookingReportResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BookingReportResponseDto>> GetBookingReport(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null,
        [FromQuery, StringLength(20)] string? status = null,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetUserId(out var userId))
        {
            return InvalidUser();
        }

        try
        {
            var report = await _reportService.GetBookingReportAsync(
                userId,
                User.IsInRole("Admin"),
                fromDate,
                toDate,
                status,
                cancellationToken);
            return Ok(report);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: exception.Message));
        }
    }

    [HttpGet("payments")]
    [ProducesResponseType(typeof(PaymentReportResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PaymentReportResponseDto>> GetPaymentReport(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null,
        [FromQuery, StringLength(20)] string? paymentStatus = null,
        [FromQuery, StringLength(20)] string? paymentMethod = null,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetUserId(out var userId))
        {
            return InvalidUser();
        }

        try
        {
            var report = await _reportService.GetPaymentReportAsync(
                userId,
                User.IsInRole("Admin"),
                fromDate,
                toDate,
                paymentStatus,
                paymentMethod,
                cancellationToken);
            return Ok(report);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: exception.Message));
        }
    }

    [HttpGet("revenue")]
    [ProducesResponseType(typeof(RevenueReportResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RevenueReportResponseDto>> GetRevenueReport(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetUserId(out var userId))
        {
            return InvalidUser();
        }

        try
        {
            var report = await _reportService.GetRevenueReportAsync(
                userId,
                User.IsInRole("Admin"),
                fromDate,
                toDate,
                cancellationToken);
            return Ok(report);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: exception.Message));
        }
    }

    [HttpGet("customers")]
    [ProducesResponseType(typeof(CustomerReportResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CustomerReportResponseDto>> GetCustomerReport(
        CancellationToken cancellationToken = default)
    {
        if (!TryGetUserId(out var userId))
        {
            return InvalidUser();
        }

        var report = await _reportService.GetCustomerReportAsync(
            userId,
            User.IsInRole("Admin"),
            cancellationToken);
        return Ok(report);
    }

    [HttpGet("lead-conversion")]
    [ProducesResponseType(typeof(LeadConversionReportResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<LeadConversionReportResponseDto>> GetLeadConversionReport(
        CancellationToken cancellationToken = default)
    {
        if (!TryGetUserId(out var userId))
        {
            return InvalidUser();
        }

        var report = await _reportService.GetLeadConversionReportAsync(
            userId,
            User.IsInRole("Admin"),
            cancellationToken);
        return Ok(report);
    }

    private UnauthorizedObjectResult InvalidUser() =>
        Unauthorized(Problem(
            statusCode: StatusCodes.Status401Unauthorized,
            title: "A valid user identity is required."));

    private bool TryGetUserId(out int userId) =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
}
