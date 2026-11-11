using TravelCRM.Api.Models;

namespace TravelCRM.Api.Repositories.Interfaces;

public interface IPaymentRepository
{
    Task<(IReadOnlyList<Payment> Items, int TotalCount)> GetPagedAsync(
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
        CancellationToken cancellationToken);

    Task<Payment?> GetByIdAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        bool tracked,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<Payment>> GetBookingHistoryAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<BookingPaymentTotals> GetTotalsAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<IReadOnlyDictionary<int, BookingPaymentTotals>> GetTotalsByBookingIdsAsync(
        IReadOnlyCollection<int> bookingIds,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<PaymentDashboardTotals> GetDashboardTotalsAsync(
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<PaymentOperationResult<Payment>> CreateAsync(
        Payment payment,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<PaymentOperationResult<Payment>> UpdatePendingAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        UpdatePaymentData update,
        CancellationToken cancellationToken);

    Task<PaymentOperationResult<Payment>> ChangeStatusAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        string status,
        CancellationToken cancellationToken);

    Task<PaymentOperationStatus> DeletePendingAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);
}

public sealed record UpdatePaymentData(
    decimal Amount,
    string PaymentType,
    string PaymentMethod,
    DateTimeOffset PaymentDate,
    string? TransactionReference,
    string? Notes);
