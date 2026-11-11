using System.ComponentModel.DataAnnotations;

namespace TravelCRM.Api.DTOs.Payments;

/// <summary>Input for recording a payment or refund against a booking.</summary>
public sealed record CreatePaymentRequestDto
{
    [Range(1, int.MaxValue)]
    public int BookingId { get; init; }

    [Range(typeof(decimal), "0.01", "9999999999999999.99")]
    public decimal Amount { get; init; }

    [Required, RegularExpression("^(Advance|Partial|Final|Refund)$")]
    public required string PaymentType { get; init; }

    [Required, RegularExpression("^(Cash|BankTransfer|UPI|Card|Other)$")]
    public required string PaymentMethod { get; init; }

    [Required, RegularExpression("^(Pending|Completed)$")]
    public required string PaymentStatus { get; init; }

    public DateTimeOffset PaymentDate { get; init; }

    [StringLength(150)]
    public string? TransactionReference { get; init; }

    [StringLength(1000)]
    public string? Notes { get; init; }
}

/// <summary>Editable details for a pending payment; its booking cannot be changed.</summary>
public sealed record UpdatePaymentRequestDto
{
    [Range(typeof(decimal), "0.01", "9999999999999999.99")]
    public decimal Amount { get; init; }

    [Required, RegularExpression("^(Advance|Partial|Final|Refund)$")]
    public required string PaymentType { get; init; }

    [Required, RegularExpression("^(Cash|BankTransfer|UPI|Card|Other)$")]
    public required string PaymentMethod { get; init; }

    public DateTimeOffset PaymentDate { get; init; }

    [StringLength(150)]
    public string? TransactionReference { get; init; }

    [StringLength(1000)]
    public string? Notes { get; init; }
}

/// <summary>Moves a pending payment to completed or failed.</summary>
public sealed record ChangePaymentStatusRequestDto
{
    [Required, RegularExpression("^(Completed|Failed)$")]
    public required string Status { get; init; }
}

/// <summary>A paginated collection of payment records.</summary>
public sealed record PagedPaymentsResponseDto<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

/// <summary>A payment with its related booking and customer display fields.</summary>
public sealed record PaymentResponseDto(
    int PaymentId,
    int BookingId,
    string BookingNumber,
    string CustomerName,
    string Currency,
    decimal Amount,
    string PaymentType,
    string PaymentMethod,
    string PaymentStatus,
    DateTimeOffset PaymentDate,
    string? TransactionReference,
    string? Notes,
    int CreatedByUserId,
    string CreatedByName,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

/// <summary>Payment totals calculated from completed receipts, refunds, and pending receipts.</summary>
public sealed record BookingPaymentSummaryDto(
    decimal BookingTotal,
    string Currency,
    decimal GrossPaid,
    decimal RefundedAmount,
    decimal NetPaid,
    decimal BalanceAmount,
    string PaymentStatus,
    decimal PendingAmount);

/// <summary>Payment details, booking summary, and payment history for the booking.</summary>
public sealed record PaymentDetailsDto(
    PaymentResponseDto Payment,
    BookingPaymentSummaryDto Summary,
    IReadOnlyList<PaymentResponseDto> BookingHistory);

/// <summary>Payment summary and payment history associated with a booking.</summary>
public sealed record BookingPaymentHistoryDto(
    int BookingId,
    string BookingNumber,
    string CustomerName,
    BookingPaymentSummaryDto Summary,
    IReadOnlyList<PaymentResponseDto> Payments);

/// <summary>Real payment and outstanding-balance metrics for the dashboard.</summary>
public sealed record PaymentDashboardSummaryDto(
    IReadOnlyList<PaymentDashboardCurrencySummaryDto> Currencies);

public sealed record PaymentDashboardCurrencySummaryDto(
    string Currency,
    decimal TotalPaymentsReceived,
    decimal PendingPayments,
    decimal OutstandingBookingBalance,
    decimal RefundsProcessed);
