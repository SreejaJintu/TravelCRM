namespace TravelCRM.Api.Models;

public static class PaymentTypes
{
    public const string Advance = "Advance";
    public const string Partial = "Partial";
    public const string Final = "Final";
    public const string Refund = "Refund";

    public static bool IsValid(string value) =>
        value is Advance or Partial or Final or Refund;
}

public static class PaymentMethods
{
    public const string Cash = "Cash";
    public const string BankTransfer = "BankTransfer";
    public const string Upi = "UPI";
    public const string Card = "Card";
    public const string Other = "Other";

    public static bool IsValid(string value) =>
        value is Cash or BankTransfer or Upi or Card or Other;
}

public static class PaymentStatuses
{
    public const string Pending = "Pending";
    public const string Completed = "Completed";
    public const string Failed = "Failed";

    public static bool IsValid(string value) =>
        value is Pending or Completed or Failed;

    public static bool CanTransitionTo(string current, string next) =>
        current == Pending && next is Completed or Failed;
}

public class Payment
{
    public int PaymentId { get; set; }
    public int BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    public decimal Amount { get; set; }
    public string PaymentType { get; set; } = PaymentTypes.Partial;
    public string PaymentMethod { get; set; } = PaymentMethods.Other;
    public string PaymentStatus { get; set; } = PaymentStatuses.Pending;
    public DateTimeOffset PaymentDate { get; set; }
    public string? TransactionReference { get; set; }
    public string? Notes { get; set; }
    public int CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int? UpdatedByUserId { get; set; }
    public User? UpdatedByUser { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public enum PaymentOperationStatus
{
    Success,
    NotFound,
    InvalidInput,
    InvalidPaymentType,
    InvalidPaymentMethod,
    InvalidPaymentStatus,
    InvalidTransition,
    CompletedPaymentImmutable,
    Overpayment,
    RefundExceedsPaid,
    Forbidden,
    Conflict
}

public sealed record PaymentOperationResult<T>(
    PaymentOperationStatus Status,
    T? Value = default);

public sealed record BookingPaymentTotals(
    decimal GrossPaid,
    decimal RefundedAmount,
    decimal PendingAmount)
{
    public decimal NetPaid => GrossPaid - RefundedAmount;
}

public sealed record PaymentDashboardCurrencyTotals(
    string Currency,
    decimal TotalPaymentsReceived,
    decimal PendingPayments,
    decimal OutstandingBookingBalance,
    decimal RefundsProcessed);

public sealed record PaymentDashboardTotals(
    IReadOnlyList<PaymentDashboardCurrencyTotals> Currencies);
