using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelCRM.Api.DTOs.Payments;
using TravelCRM.Api.Models;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public sealed class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedPaymentsResponseDto<PaymentResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedPaymentsResponseDto<PaymentResponseDto>>> GetPayments(
        [FromQuery, StringLength(100)] string? search = null,
        [FromQuery, Range(1, int.MaxValue)] int? bookingId = null,
        [FromQuery, StringLength(20)] string? status = null,
        [FromQuery, StringLength(20)] string? method = null,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        try
        {
            return Ok(await _paymentService.GetPagedAsync(
                userId,
                User.IsInRole("Admin"),
                search,
                bookingId,
                status,
                method,
                from,
                to,
                page,
                pageSize,
                cancellationToken));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: exception.Message));
        }
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(PaymentDashboardSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PaymentDashboardSummaryDto>> GetSummary(
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        return Ok(await _paymentService.GetDashboardSummaryAsync(
            userId, User.IsInRole("Admin"), cancellationToken));
    }

    [HttpGet("booking/{bookingId:int}")]
    [ProducesResponseType(typeof(BookingPaymentHistoryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<BookingPaymentHistoryDto>> GetBookingHistory(
        int bookingId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        var history = await _paymentService.GetBookingHistoryAsync(
            bookingId, userId, User.IsInRole("Admin"), cancellationToken);
        return history is null
            ? NotFound(Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Booking not found or unavailable."))
            : Ok(history);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PaymentDetailsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PaymentDetailsDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        var payment = await _paymentService.GetByIdAsync(
            id, userId, User.IsInRole("Admin"), cancellationToken);
        return payment is null ? PaymentNotFound() : Ok(payment);
    }

    [HttpPost]
    [ProducesResponseType(typeof(PaymentDetailsDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<PaymentDetailsDto>> Create(
        CreatePaymentRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        var result = await _paymentService.CreateAsync(
            userId, User.IsInRole("Admin"), request, cancellationToken);
        return result.Status == PaymentOperationStatus.Success
            ? CreatedAtAction(nameof(GetById), new { id = result.Value!.Payment.PaymentId }, result.Value)
            : MapFailure(result.Status);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(PaymentDetailsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PaymentDetailsDto>> Update(
        int id,
        UpdatePaymentRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        var result = await _paymentService.UpdateAsync(
            id, userId, User.IsInRole("Admin"), request, cancellationToken);
        return result.Status == PaymentOperationStatus.Success
            ? Ok(result.Value)
            : MapFailure(result.Status);
    }

    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(PaymentDetailsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PaymentDetailsDto>> ChangeStatus(
        int id,
        ChangePaymentStatusRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        var result = await _paymentService.ChangeStatusAsync(
            id, userId, User.IsInRole("Admin"), request.Status, cancellationToken);
        return result.Status == PaymentOperationStatus.Success
            ? Ok(result.Value)
            : MapFailure(result.Status);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        var result = await _paymentService.DeleteAsync(
            id, userId, User.IsInRole("Admin"), cancellationToken);
        return result == PaymentOperationStatus.Success
            ? NoContent()
            : MapFailure(result);
    }

    private ActionResult MapFailure(PaymentOperationStatus status) =>
        status switch
        {
            PaymentOperationStatus.NotFound => PaymentNotFound(),
            PaymentOperationStatus.Forbidden => Forbid(),
            PaymentOperationStatus.InvalidInput or
            PaymentOperationStatus.InvalidPaymentType or
            PaymentOperationStatus.InvalidPaymentMethod or
            PaymentOperationStatus.InvalidPaymentStatus => BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: FailureMessage(status))),
            PaymentOperationStatus.InvalidTransition or
            PaymentOperationStatus.CompletedPaymentImmutable or
            PaymentOperationStatus.Overpayment or
            PaymentOperationStatus.RefundExceedsPaid or
            PaymentOperationStatus.Conflict => Conflict(Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: FailureMessage(status))),
            _ => BadRequest(Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "The payment request is invalid."))
        };

    private static string FailureMessage(PaymentOperationStatus status) =>
        status switch
        {
            PaymentOperationStatus.InvalidInput => "Amount and payment date are invalid.",
            PaymentOperationStatus.InvalidPaymentType => "The payment type is invalid.",
            PaymentOperationStatus.InvalidPaymentMethod => "The payment method is invalid.",
            PaymentOperationStatus.InvalidPaymentStatus => "The payment status is invalid.",
            PaymentOperationStatus.InvalidTransition => "The payment status transition is not allowed.",
            PaymentOperationStatus.CompletedPaymentImmutable => "Only pending payments can be edited or deleted.",
            PaymentOperationStatus.Overpayment => "The completed payment exceeds the remaining booking balance.",
            PaymentOperationStatus.RefundExceedsPaid => "The refund exceeds the booking's current net paid amount.",
            _ => "The payment conflicts with its current state."
        };

    private NotFoundObjectResult PaymentNotFound() =>
        NotFound(Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: "Payment not found or unavailable."));

    private UnauthorizedObjectResult InvalidUser() =>
        Unauthorized(Problem(
            statusCode: StatusCodes.Status401Unauthorized,
            title: "A valid user identity is required."));

    private bool TryGetUserId(out int userId) =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
}
