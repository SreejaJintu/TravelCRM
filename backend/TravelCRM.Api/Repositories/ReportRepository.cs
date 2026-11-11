using Microsoft.EntityFrameworkCore;
using TravelCRM.Api.Data;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;

namespace TravelCRM.Api.Repositories;

public sealed class ReportRepository : IReportRepository
{
    private readonly ApplicationDbContext _context;

    public ReportRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<(IReadOnlyList<Booking> Items, int TotalCount)> GetBookingsForReportAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        string? status,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(status) && !BookingStatuses.IsValid(status))
        {
            throw new ArgumentException("The booking status is invalid.", nameof(status));
        }

        if (fromDate.HasValue && toDate.HasValue && fromDate.Value > toDate.Value)
        {
            throw new ArgumentException("The booking date range is invalid.", nameof(toDate));
        }

        IQueryable<Booking> query = ApplyAccessFilter(
            _context.Bookings.AsNoTracking(), userId, isAdmin);

        if (fromDate.HasValue)
        {
            query = query.Where(booking => booking.TravelStartDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(booking => booking.TravelStartDate <= toDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(booking => booking.BookingStatus == status);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Include(booking => booking.Customer)
            .Include(booking => booking.TravelPackage)
            .OrderByDescending(booking => booking.CreatedAt)
            .ThenByDescending(booking => booking.BookingId)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<Payment> Items, int TotalCount)> GetPaymentsForReportAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        string? paymentStatus,
        string? paymentMethod,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(paymentStatus) && !PaymentStatuses.IsValid(paymentStatus))
        {
            throw new ArgumentException("The payment status filter is invalid.", nameof(paymentStatus));
        }

        if (!string.IsNullOrWhiteSpace(paymentMethod) && !PaymentMethods.IsValid(paymentMethod))
        {
            throw new ArgumentException("The payment method filter is invalid.", nameof(paymentMethod));
        }

        if (fromDate.HasValue && toDate.HasValue && fromDate.Value > toDate.Value)
        {
            throw new ArgumentException("The payment date range is invalid.", nameof(toDate));
        }

        IQueryable<Payment> query = ApplyPaymentAccessFilter(
            _context.Payments.AsNoTracking(), userId, isAdmin);

        if (fromDate.HasValue)
        {
            var start = new DateTimeOffset(fromDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
            query = query.Where(payment => payment.PaymentDate >= start);
        }

        if (toDate.HasValue)
        {
            var endExclusive = new DateTimeOffset(toDate.Value.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
            query = query.Where(payment => payment.PaymentDate < endExclusive);
        }

        if (!string.IsNullOrWhiteSpace(paymentStatus))
        {
            query = query.Where(payment => payment.PaymentStatus == paymentStatus);
        }

        if (!string.IsNullOrWhiteSpace(paymentMethod))
        {
            query = query.Where(payment => payment.PaymentMethod == paymentMethod);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Include(payment => payment.Booking)
                .ThenInclude(booking => booking.Customer)
            .OrderByDescending(payment => payment.PaymentDate)
            .ThenByDescending(payment => payment.PaymentId)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    private static IQueryable<Booking> ApplyAccessFilter(
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
                    (booking.Lead.CreatedByUserId == userId || booking.Lead.AssignedToUserId == userId)));

    public async Task<IReadOnlyList<Payment>> GetAllPaymentsForRevenueAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        CancellationToken cancellationToken)
    {
        if (fromDate.HasValue && toDate.HasValue && fromDate.Value > toDate.Value)
        {
            throw new ArgumentException("The payment date range is invalid.", nameof(toDate));
        }

        IQueryable<Payment> query = ApplyPaymentAccessFilter(
            _context.Payments.AsNoTracking(), userId, isAdmin);

        if (fromDate.HasValue)
        {
            var start = new DateTimeOffset(fromDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
            query = query.Where(payment => payment.PaymentDate >= start);
        }

        if (toDate.HasValue)
        {
            var endExclusive = new DateTimeOffset(toDate.Value.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
            query = query.Where(payment => payment.PaymentDate < endExclusive);
        }

        return await query
            .Include(payment => payment.Booking)
            .OrderByDescending(payment => payment.PaymentDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<Customer> Items, int TotalCount)> GetCustomersForReportAsync(
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        IQueryable<Customer> query = _context.Customers.AsNoTracking();

        if (!isAdmin)
        {
            query = query.Where(customer => customer.CreatedByUserId == userId);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(customer => customer.CreatedAt)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<IReadOnlyList<Lead>> GetLeadsForConversionReportAsync(
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        IQueryable<Lead> query = _context.Leads.AsNoTracking();

        if (!isAdmin)
        {
            query = query.Where(lead =>
                lead.CreatedByUserId == userId ||
                lead.AssignedToUserId == userId);
        }

        return await query
            .Include(lead => lead.ConvertedCustomer)
            .OrderByDescending(lead => lead.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    private static IQueryable<Payment> ApplyPaymentAccessFilter(
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
}
