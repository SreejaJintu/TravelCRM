using System.Data;
using Microsoft.EntityFrameworkCore;
using TravelCRM.Api.Data;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;

namespace TravelCRM.Api.Repositories;

public sealed class PaymentRepository : IPaymentRepository
{
    private readonly ApplicationDbContext _context;

    public PaymentRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<(IReadOnlyList<Payment> Items, int TotalCount)> GetPagedAsync(
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
        IQueryable<Payment> query = ApplyAccessFilter(
            _context.Payments.AsNoTracking(), userId, isAdmin);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(payment =>
                payment.Booking.BookingNumber.Contains(term) ||
                payment.Booking.Customer.FullName.Contains(term));
        }

        if (bookingId.HasValue)
        {
            query = query.Where(payment => payment.BookingId == bookingId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(payment => payment.PaymentStatus == status);
        }

        if (!string.IsNullOrWhiteSpace(method))
        {
            query = query.Where(payment => payment.PaymentMethod == method);
        }

        if (from.HasValue)
        {
            var start = new DateTimeOffset(from.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
            query = query.Where(payment => payment.PaymentDate >= start);
        }

        if (to.HasValue)
        {
            var endExclusive = new DateTimeOffset(to.Value.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
            query = query.Where(payment => payment.PaymentDate < endExclusive);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Include(payment => payment.Booking)
                .ThenInclude(booking => booking.Customer)
            .Include(payment => payment.CreatedByUser)
            .OrderByDescending(payment => payment.PaymentDate)
            .ThenByDescending(payment => payment.PaymentId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<Payment?> GetByIdAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        bool tracked,
        CancellationToken cancellationToken)
    {
        IQueryable<Payment> query = ApplyAccessFilter(_context.Payments, userId, isAdmin);
        if (!tracked)
        {
            query = query.AsNoTracking();
        }

        return query
            .Include(payment => payment.Booking)
                .ThenInclude(booking => booking.Customer)
            .Include(payment => payment.CreatedByUser)
            .Include(payment => payment.UpdatedByUser)
            .FirstOrDefaultAsync(payment => payment.PaymentId == paymentId, cancellationToken);
    }

    public async Task<IReadOnlyList<Payment>> GetBookingHistoryAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        return await ApplyAccessFilter(_context.Payments.AsNoTracking(), userId, isAdmin)
            .Where(payment => payment.BookingId == bookingId)
            .Include(payment => payment.Booking)
                .ThenInclude(booking => booking.Customer)
            .Include(payment => payment.CreatedByUser)
            .OrderBy(payment => payment.PaymentDate)
            .ThenBy(payment => payment.PaymentId)
            .ToListAsync(cancellationToken);
    }

    public async Task<BookingPaymentTotals> GetTotalsAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var totals = await ApplyAccessFilter(_context.Payments.AsNoTracking(), userId, isAdmin)
            .Where(payment => payment.BookingId == bookingId)
            .GroupBy(payment => payment.BookingId)
            .Select(group => new BookingPaymentTotals(
                group.Where(payment =>
                        payment.PaymentStatus == PaymentStatuses.Completed &&
                        payment.PaymentType != PaymentTypes.Refund)
                    .Sum(payment => payment.Amount),
                group.Where(payment =>
                        payment.PaymentStatus == PaymentStatuses.Completed &&
                        payment.PaymentType == PaymentTypes.Refund)
                    .Sum(payment => payment.Amount),
                group.Where(payment =>
                        payment.PaymentStatus == PaymentStatuses.Pending &&
                        payment.PaymentType != PaymentTypes.Refund)
                    .Sum(payment => payment.Amount)))
            .FirstOrDefaultAsync(cancellationToken);

        return totals ?? new BookingPaymentTotals(0m, 0m, 0m);
    }

    public async Task<IReadOnlyDictionary<int, BookingPaymentTotals>> GetTotalsByBookingIdsAsync(
        IReadOnlyCollection<int> bookingIds,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        if (bookingIds.Count == 0)
        {
            return new Dictionary<int, BookingPaymentTotals>();
        }

        var totals = await ApplyAccessFilter(_context.Payments.AsNoTracking(), userId, isAdmin)
            .Where(payment => bookingIds.Contains(payment.BookingId))
            .GroupBy(payment => payment.BookingId)
            .Select(group => new
            {
                BookingId = group.Key,
                GrossPaid = group.Where(payment =>
                        payment.PaymentStatus == PaymentStatuses.Completed &&
                        payment.PaymentType != PaymentTypes.Refund)
                    .Sum(payment => payment.Amount),
                RefundedAmount = group.Where(payment =>
                        payment.PaymentStatus == PaymentStatuses.Completed &&
                        payment.PaymentType == PaymentTypes.Refund)
                    .Sum(payment => payment.Amount),
                PendingAmount = group.Where(payment =>
                        payment.PaymentStatus == PaymentStatuses.Pending &&
                        payment.PaymentType != PaymentTypes.Refund)
                    .Sum(payment => payment.Amount)
            })
            .ToDictionaryAsync(
                item => item.BookingId,
                item => new BookingPaymentTotals(
                    item.GrossPaid,
                    item.RefundedAmount,
                    item.PendingAmount),
                cancellationToken);
        return totals;
    }

    public async Task<PaymentDashboardTotals> GetDashboardTotalsAsync(
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var paymentQuery = ApplyAccessFilter(_context.Payments.AsNoTracking(), userId, isAdmin);
        var paymentMetrics = await paymentQuery
            .GroupBy(payment => payment.Booking.Currency)
            .Select(group => new
            {
                Currency = group.Key,
                Received = group.Where(payment =>
                        payment.PaymentStatus == PaymentStatuses.Completed &&
                        payment.PaymentType != PaymentTypes.Refund)
                    .Sum(payment => (decimal?)payment.Amount) ?? 0m,
                Pending = group.Where(payment =>
                        payment.PaymentStatus == PaymentStatuses.Pending)
                    .Sum(payment => (decimal?)payment.Amount) ?? 0m,
                Refunds = group.Where(payment =>
                        payment.PaymentStatus == PaymentStatuses.Completed &&
                        payment.PaymentType == PaymentTypes.Refund)
                    .Sum(payment => (decimal?)payment.Amount) ?? 0m
            })
            .ToListAsync(cancellationToken);

        var balances = await ApplyBookingAccessFilter(_context.Bookings.AsNoTracking(), userId, isAdmin)
            .Select(booking => new
            {
                booking.Currency,
                booking.TotalAmount,
                Gross = booking.Payments
                    .Where(payment => payment.PaymentStatus == PaymentStatuses.Completed &&
                        payment.PaymentType != PaymentTypes.Refund)
                    .Sum(payment => (decimal?)payment.Amount) ?? 0m,
                Refunds = booking.Payments
                    .Where(payment => payment.PaymentStatus == PaymentStatuses.Completed &&
                        payment.PaymentType == PaymentTypes.Refund)
                    .Sum(payment => (decimal?)payment.Amount) ?? 0m
            })
            .ToListAsync(cancellationToken);

        var currencies = paymentMetrics.Select(item => item.Currency)
            .Concat(balances.Select(item => item.Currency))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(currency =>
            {
                var paymentTotals = paymentMetrics.FirstOrDefault(item =>
                    string.Equals(item.Currency, currency, StringComparison.OrdinalIgnoreCase));
                var outstanding = balances
                    .Where(item => string.Equals(item.Currency, currency, StringComparison.OrdinalIgnoreCase))
                    .Sum(item => Math.Max(0m, item.TotalAmount - item.Gross + item.Refunds));
                return new PaymentDashboardCurrencyTotals(
                    currency,
                    paymentTotals?.Received ?? 0m,
                    paymentTotals?.Pending ?? 0m,
                    outstanding,
                    paymentTotals?.Refunds ?? 0m);
            })
            .OrderBy(item => item.Currency)
            .ToArray();

        return new PaymentDashboardTotals(currencies);
    }

    public async Task<PaymentOperationResult<Payment>> CreateAsync(
        Payment payment,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var booking = await ApplyBookingAccessFilter(_context.Bookings, userId, isAdmin)
            .FirstOrDefaultAsync(item => item.BookingId == payment.BookingId, cancellationToken);
        if (booking is null)
        {
            return await _context.Bookings.AnyAsync(
                    item => item.BookingId == payment.BookingId,
                    cancellationToken)
                ? new PaymentOperationResult<Payment>(PaymentOperationStatus.Forbidden)
                : new PaymentOperationResult<Payment>(PaymentOperationStatus.NotFound);
        }

        payment.Booking = booking;
        if (payment.PaymentStatus == PaymentStatuses.Completed)
        {
            var status = await ValidateCompletedAmountAsync(payment, cancellationToken);
            if (status != PaymentOperationStatus.Success)
            {
                return new PaymentOperationResult<Payment>(status);
            }
        }

        payment.CreatedByUserId = userId;
        payment.CreatedAt = DateTime.UtcNow;
        await _context.Payments.AddAsync(payment, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new PaymentOperationResult<Payment>(PaymentOperationStatus.Success, payment);
    }

    public async Task<PaymentOperationResult<Payment>> UpdatePendingAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        UpdatePaymentData update,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var payment = await GetByIdAsync(paymentId, userId, isAdmin, true, cancellationToken);
        if (payment is null)
        {
            return new PaymentOperationResult<Payment>(PaymentOperationStatus.NotFound);
        }

        if (payment.PaymentStatus != PaymentStatuses.Pending)
        {
            return new PaymentOperationResult<Payment>(PaymentOperationStatus.CompletedPaymentImmutable);
        }

        payment.Amount = update.Amount;
        payment.PaymentType = update.PaymentType;
        payment.PaymentMethod = update.PaymentMethod;
        payment.PaymentDate = update.PaymentDate;
        payment.TransactionReference = update.TransactionReference;
        payment.Notes = update.Notes;
        payment.UpdatedByUserId = userId;
        payment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new PaymentOperationResult<Payment>(PaymentOperationStatus.Success, payment);
    }

    public async Task<PaymentOperationResult<Payment>> ChangeStatusAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        string status,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var payment = await GetByIdAsync(paymentId, userId, isAdmin, true, cancellationToken);
        if (payment is null)
        {
            return new PaymentOperationResult<Payment>(PaymentOperationStatus.NotFound);
        }

        if (!PaymentStatuses.CanTransitionTo(payment.PaymentStatus, status))
        {
            return new PaymentOperationResult<Payment>(PaymentOperationStatus.InvalidTransition);
        }

        if (status == PaymentStatuses.Completed)
        {
            var validation = await ValidateCompletedAmountAsync(payment, cancellationToken);
            if (validation != PaymentOperationStatus.Success)
            {
                return new PaymentOperationResult<Payment>(validation);
            }
        }

        payment.PaymentStatus = status;
        payment.UpdatedByUserId = userId;
        payment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new PaymentOperationResult<Payment>(PaymentOperationStatus.Success, payment);
    }

    public async Task<PaymentOperationStatus> DeletePendingAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var payment = await GetByIdAsync(paymentId, userId, isAdmin, true, cancellationToken);
        if (payment is null)
        {
            return PaymentOperationStatus.NotFound;
        }

        if (payment.PaymentStatus != PaymentStatuses.Pending)
        {
            return PaymentOperationStatus.CompletedPaymentImmutable;
        }

        _context.Payments.Remove(payment);
        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return PaymentOperationStatus.Success;
    }

    private async Task<PaymentOperationStatus> ValidateCompletedAmountAsync(
        Payment payment,
        CancellationToken cancellationToken)
    {
        var totals = await _context.Payments.AsNoTracking()
            .Where(item => item.BookingId == payment.BookingId &&
                item.PaymentStatus == PaymentStatuses.Completed)
            .GroupBy(item => item.BookingId)
            .Select(group => new BookingPaymentTotals(
                group.Where(item => item.PaymentType != PaymentTypes.Refund).Sum(item => item.Amount),
                group.Where(item => item.PaymentType == PaymentTypes.Refund).Sum(item => item.Amount),
                0m))
            .FirstOrDefaultAsync(cancellationToken) ?? new BookingPaymentTotals(0m, 0m, 0m);

        if (payment.PaymentType == PaymentTypes.Refund)
        {
            return payment.Amount <= totals.NetPaid
                ? PaymentOperationStatus.Success
                : PaymentOperationStatus.RefundExceedsPaid;
        }

        return totals.NetPaid + payment.Amount <= payment.Booking.TotalAmount
            ? PaymentOperationStatus.Success
            : PaymentOperationStatus.Overpayment;
    }

    private IQueryable<Payment> ApplyAccessFilter(
        IQueryable<Payment> query,
        int userId,
        bool isAdmin) =>
        isAdmin
            ? query
            : query.Where(payment =>
                payment.Booking.CreatedByUserId == userId ||
                payment.Booking.AssignedToUserId == userId ||
                payment.Booking.Customer.CreatedByUserId == userId ||
                (payment.Booking.Lead != null &&
                    (payment.Booking.Lead.CreatedByUserId == userId ||
                     payment.Booking.Lead.AssignedToUserId == userId)));

    private static IQueryable<Booking> ApplyBookingAccessFilter(
        IQueryable<Booking> query,
        int userId,
        bool isAdmin) =>
        isAdmin
            ? query
            : query.Where(booking =>
                booking.CreatedByUserId == userId ||
                booking.AssignedToUserId == userId ||
                booking.Customer.CreatedByUserId == userId ||
                (booking.Lead != null &&
                    (booking.Lead.CreatedByUserId == userId ||
                     booking.Lead.AssignedToUserId == userId)));
}
