using TravelCRM.Api.DTOs.Bookings;
using TravelCRM.Api.DTOs.Payments;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Services;

public sealed class PaymentService : IPaymentService
{
    private readonly IPaymentRepository _paymentRepository;
    private readonly IBookingRepository _bookingRepository;

    public PaymentService(
        IPaymentRepository paymentRepository,
        IBookingRepository bookingRepository)
    {
        _paymentRepository = paymentRepository;
        _bookingRepository = bookingRepository;
    }

    public async Task<PagedPaymentsResponseDto<PaymentResponseDto>> GetPagedAsync(
        int userId,
        bool isAdmin,
        string? search,
        int? bookingId,
        string? status,
        string? method,
        DateOnly? from,
        DateOnly? to,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        ValidateFilters(status, method, from, to);
        var (items, totalCount) = await _paymentRepository.GetPagedAsync(
            userId, isAdmin, search, bookingId, status, method, from, to,
            page, pageSize, cancellationToken);
        return new PagedPaymentsResponseDto<PaymentResponseDto>(
            items.Select(ToResponse).ToArray(),
            page,
            pageSize,
            totalCount,
            totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize));
    }

    public async Task<PaymentDetailsDto?> GetByIdAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var payment = await _paymentRepository.GetByIdAsync(
            paymentId, userId, isAdmin, false, cancellationToken);
        return payment is null
            ? null
            : await ToDetailsAsync(payment, userId, isAdmin, cancellationToken);
    }

    public async Task<BookingPaymentHistoryDto?> GetBookingHistoryAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetByIdAsync(
            bookingId, userId, isAdmin, false, cancellationToken);
        if (booking is null)
        {
            return null;
        }

        var history = await _paymentRepository.GetBookingHistoryAsync(
            bookingId, userId, isAdmin, cancellationToken);
        var totals = await _paymentRepository.GetTotalsAsync(
            bookingId, userId, isAdmin, cancellationToken);
        return new BookingPaymentHistoryDto(
            booking.BookingId,
            booking.BookingNumber,
            booking.Customer.FullName,
            ToSummary(booking.TotalAmount, booking.Currency, totals),
            history.Select(ToResponse).ToArray());
    }

    public async Task<PaymentDashboardSummaryDto> GetDashboardSummaryAsync(
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var totals = await _paymentRepository.GetDashboardTotalsAsync(
            userId, isAdmin, cancellationToken);
        return new PaymentDashboardSummaryDto(totals.Currencies
            .Select(item => new PaymentDashboardCurrencySummaryDto(
                item.Currency,
                item.TotalPaymentsReceived,
                item.PendingPayments,
                item.OutstandingBookingBalance,
                item.RefundsProcessed))
            .ToArray());
    }

    public async Task<PaymentOperationResult<PaymentDetailsDto>> CreateAsync(
        int userId,
        bool isAdmin,
        CreatePaymentRequestDto request,
        CancellationToken cancellationToken)
    {
        var validation = ValidateRequest(
            request.Amount,
            request.PaymentType,
            request.PaymentMethod,
            request.PaymentStatus,
            request.PaymentDate);
        if (validation != PaymentOperationStatus.Success)
        {
            return new PaymentOperationResult<PaymentDetailsDto>(validation);
        }

        var payment = new Payment
        {
            BookingId = request.BookingId,
            Amount = request.Amount,
            PaymentType = request.PaymentType,
            PaymentMethod = request.PaymentMethod,
            PaymentStatus = request.PaymentStatus,
            PaymentDate = request.PaymentDate,
            TransactionReference = NormalizeOptional(request.TransactionReference),
            Notes = NormalizeOptional(request.Notes)
        };
        var result = await _paymentRepository.CreateAsync(
            payment, userId, isAdmin, cancellationToken);
        if (result.Status != PaymentOperationStatus.Success)
        {
            return new PaymentOperationResult<PaymentDetailsDto>(result.Status);
        }

        var created = await GetByIdAsync(
            result.Value!.PaymentId, userId, isAdmin, cancellationToken);
        return new PaymentOperationResult<PaymentDetailsDto>(
            PaymentOperationStatus.Success,
            created);
    }

    public async Task<PaymentOperationResult<PaymentDetailsDto>> UpdateAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        UpdatePaymentRequestDto request,
        CancellationToken cancellationToken)
    {
        var validation = ValidateRequest(
            request.Amount,
            request.PaymentType,
            request.PaymentMethod,
            PaymentStatuses.Pending,
            request.PaymentDate);
        if (validation != PaymentOperationStatus.Success)
        {
            return new PaymentOperationResult<PaymentDetailsDto>(validation);
        }

        var result = await _paymentRepository.UpdatePendingAsync(
            paymentId,
            userId,
            isAdmin,
            new UpdatePaymentData(
                request.Amount,
                request.PaymentType,
                request.PaymentMethod,
                request.PaymentDate,
                NormalizeOptional(request.TransactionReference),
                NormalizeOptional(request.Notes)),
            cancellationToken);
        if (result.Status != PaymentOperationStatus.Success)
        {
            return new PaymentOperationResult<PaymentDetailsDto>(result.Status);
        }

        var updated = await GetByIdAsync(paymentId, userId, isAdmin, cancellationToken);
        return new PaymentOperationResult<PaymentDetailsDto>(
            PaymentOperationStatus.Success,
            updated);
    }

    public async Task<PaymentOperationResult<PaymentDetailsDto>> ChangeStatusAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        string status,
        CancellationToken cancellationToken)
    {
        if (status is not (PaymentStatuses.Completed or PaymentStatuses.Failed))
        {
            return new PaymentOperationResult<PaymentDetailsDto>(
                PaymentOperationStatus.InvalidPaymentStatus);
        }

        var result = await _paymentRepository.ChangeStatusAsync(
            paymentId, userId, isAdmin, status, cancellationToken);
        if (result.Status != PaymentOperationStatus.Success)
        {
            return new PaymentOperationResult<PaymentDetailsDto>(result.Status);
        }

        var updated = await GetByIdAsync(paymentId, userId, isAdmin, cancellationToken);
        return new PaymentOperationResult<PaymentDetailsDto>(
            PaymentOperationStatus.Success,
            updated);
    }

    public Task<PaymentOperationStatus> DeleteAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken) =>
        _paymentRepository.DeletePendingAsync(paymentId, userId, isAdmin, cancellationToken);

    private async Task<PaymentDetailsDto> ToDetailsAsync(
        Payment payment,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var summary = await _paymentRepository.GetTotalsAsync(
            payment.BookingId, userId, isAdmin, cancellationToken);
        var history = await _paymentRepository.GetBookingHistoryAsync(
            payment.BookingId, userId, isAdmin, cancellationToken);
        return new PaymentDetailsDto(
            ToResponse(payment),
            ToSummary(payment.Booking.TotalAmount, payment.Booking.Currency, summary),
            history.Select(ToResponse).ToArray());
    }

    private static PaymentOperationStatus ValidateRequest(
        decimal amount,
        string paymentType,
        string paymentMethod,
        string paymentStatus,
        DateTimeOffset paymentDate)
    {
        if (amount <= 0m || amount > BookingPricing.MaximumAmount ||
            amount != decimal.Round(amount, 2) ||
            paymentDate == default)
        {
            return PaymentOperationStatus.InvalidInput;
        }

        if (!PaymentTypes.IsValid(paymentType))
        {
            return PaymentOperationStatus.InvalidPaymentType;
        }

        if (!PaymentMethods.IsValid(paymentMethod))
        {
            return PaymentOperationStatus.InvalidPaymentMethod;
        }

        if (paymentStatus is not (PaymentStatuses.Pending or PaymentStatuses.Completed))
        {
            return PaymentOperationStatus.InvalidPaymentStatus;
        }

        return PaymentOperationStatus.Success;
    }

    private static void ValidateFilters(
        string? status,
        string? method,
        DateOnly? from,
        DateOnly? to)
    {
        if (!string.IsNullOrWhiteSpace(status) && !PaymentStatuses.IsValid(status))
        {
            throw new ArgumentException("The payment status filter is invalid.", nameof(status));
        }

        if (!string.IsNullOrWhiteSpace(method) && !PaymentMethods.IsValid(method))
        {
            throw new ArgumentException("The payment method filter is invalid.", nameof(method));
        }

        if (from.HasValue && to.HasValue && from.Value > to.Value)
        {
            throw new ArgumentException("The payment date range is invalid.", nameof(to));
        }
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static PaymentResponseDto ToResponse(Payment payment) =>
        new(
            payment.PaymentId,
            payment.BookingId,
            payment.Booking.BookingNumber,
            payment.Booking.Customer.FullName,
            payment.Booking.Currency,
            payment.Amount,
            payment.PaymentType,
            payment.PaymentMethod,
            payment.PaymentStatus,
            payment.PaymentDate,
            payment.TransactionReference,
            payment.Notes,
            payment.CreatedByUserId,
            payment.CreatedByUser.FullName,
            new DateTimeOffset(DateTime.SpecifyKind(payment.CreatedAt, DateTimeKind.Utc)),
            payment.UpdatedAt is { } updatedAt
                ? new DateTimeOffset(DateTime.SpecifyKind(updatedAt, DateTimeKind.Utc))
                : null);

    private static BookingPaymentSummaryDto ToSummary(
        decimal bookingTotal,
        string currency,
        BookingPaymentTotals totals)
    {
        var paymentStatus = totals.NetPaid <= 0m
            ? "Unpaid"
            : totals.NetPaid < bookingTotal
                ? "Partially Paid"
                : totals.NetPaid == bookingTotal
                    ? "Paid"
                    : "Overpaid";
        return new BookingPaymentSummaryDto(
            bookingTotal,
            currency,
            totals.GrossPaid,
            totals.RefundedAmount,
            totals.NetPaid,
            bookingTotal - totals.NetPaid,
            paymentStatus,
            totals.PendingAmount);
    }
}
