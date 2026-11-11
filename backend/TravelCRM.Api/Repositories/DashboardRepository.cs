using Microsoft.EntityFrameworkCore;
using TravelCRM.Api.Data;
using TravelCRM.Api.DTOs.Dashboard;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;

namespace TravelCRM.Api.Repositories;

public sealed class DashboardRepository : IDashboardRepository
{
    private readonly ApplicationDbContext _context;

    public DashboardRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(
        int userId,
        bool isAdmin,
        DateOnly fromDate,
        DateOnly toDate,
        DateTime fromUtc,
        DateTime toUtc,
        DateOnly today,
        DateTimeOffset todayStartUtc,
        DateTimeOffset tomorrowStartUtc,
        CancellationToken cancellationToken)
    {
        var bookings = ApplyBookingAccess(_context.Bookings.AsNoTracking(), userId, isAdmin)
            .Where(booking => booking.CreatedAt >= fromUtc &&
                booking.CreatedAt < toUtc);

        var bookingStatusCounts = await bookings
            .GroupBy(booking => booking.BookingStatus)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.Status, item => item.Count, cancellationToken);

        var upcomingTripsQuery = ApplyBookingAccess(_context.Bookings.AsNoTracking(), userId, isAdmin)
            .Where(booking => booking.IsActive &&
                booking.TravelStartDate >= today &&
                booking.TravelStartDate >= fromDate &&
                booking.TravelStartDate <= toDate &&
                booking.BookingStatus != BookingStatuses.Cancelled &&
                booking.BookingStatus != BookingStatuses.Completed);

        var upcomingTripsCount = await upcomingTripsQuery.CountAsync(cancellationToken);

        var totalCustomers = await ApplyCustomerAccess(_context.Customers.AsNoTracking(), userId, isAdmin)
            .CountAsync(cancellationToken);
        var newCustomers = await ApplyCustomerAccess(_context.Customers.AsNoTracking(), userId, isAdmin)
            .CountAsync(customer => customer.CreatedAt >= fromUtc &&
                customer.CreatedAt < toUtc,
                cancellationToken);

        var leads = ApplyLeadAccess(_context.Leads.AsNoTracking(), userId, isAdmin)
            .Where(lead => lead.CreatedAt >= fromUtc && lead.CreatedAt < toUtc);
        var leadStatusCounts = await leads
            .GroupBy(lead => lead.LeadStatus)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.Status, item => item.Count, cancellationToken);
        var totalLeads = leadStatusCounts.Values.Sum();
        var convertedLeads = GetCount(leadStatusCounts, LeadStatuses.Converted);

        var bookingTrends = await bookings
            .GroupBy(booking => EF.Functions.AtTimeZone(
                EF.Functions.AtTimeZone(booking.CreatedAt, "UTC"),
                "India Standard Time"))
            .Select(group => new
            {
                Year = group.Key.Year,
                Month = group.Key.Month,
                Count = group.Count()
            })
            .OrderBy(item => item.Year)
            .ThenBy(item => item.Month)
            .ToListAsync(cancellationToken);

        var bookingStatusDistribution = await bookings
            .GroupBy(booking => booking.BookingStatus)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        var popularPackages = await bookings
            .GroupBy(booking => booking.TravelPackage.PackageName)
            .Select(group => new
            {
                PackageName = group.Key,
                BookingCount = group.Count()
            })
            .OrderByDescending(item => item.BookingCount)
            .ThenBy(item => item.PackageName)
            .Take(5)
            .ToListAsync(cancellationToken);
        var popularPackageDtos = popularPackages
            .Select(item => new PopularPackageDto(item.PackageName, item.BookingCount))
            .ToArray();

        var paymentQuery = ApplyPaymentAccess(
                _context.Payments.AsNoTracking(), userId, isAdmin);
        var paymentStart = new DateTimeOffset(fromUtc, TimeSpan.Zero);
        var paymentEnd = new DateTimeOffset(toUtc, TimeSpan.Zero);
        var periodPayments = paymentQuery.Where(payment =>
            payment.PaymentDate >= paymentStart &&
            payment.PaymentDate < paymentEnd);

        var financialByCurrency = await periodPayments
            .GroupBy(payment => payment.Booking.Currency)
            .Select(group => new
            {
                Currency = group.Key,
                Revenue = group
                    .Where(payment => payment.PaymentStatus == PaymentStatuses.Completed)
                    .Sum(payment => payment.PaymentType == PaymentTypes.Refund
                        ? -payment.Amount
                        : payment.Amount),
                Refunded = group
                    .Where(payment =>
                        payment.PaymentStatus == PaymentStatuses.Completed &&
                        payment.PaymentType == PaymentTypes.Refund)
                    .Sum(payment => payment.Amount),
                Pending = group
                    .Where(payment => payment.PaymentStatus == PaymentStatuses.Pending)
                    .Sum(payment => payment.Amount)
            })
            .ToListAsync(cancellationToken);

        var outstandingByCurrency = await ApplyBookingAccess(
                _context.Bookings.AsNoTracking(), userId, isAdmin)
            .Where(booking => booking.CreatedAt >= fromUtc &&
                booking.CreatedAt < toUtc)
            .Select(booking => new
            {
                booking.Currency,
                Balance = booking.TotalAmount -
                    (booking.Payments
                        .Where(payment =>
                            payment.PaymentStatus == PaymentStatuses.Completed &&
                            payment.PaymentType != PaymentTypes.Refund)
                        .Sum(payment => (decimal?)payment.Amount) ?? 0m) +
                    (booking.Payments
                        .Where(payment =>
                            payment.PaymentStatus == PaymentStatuses.Completed &&
                            payment.PaymentType == PaymentTypes.Refund)
                        .Sum(payment => (decimal?)payment.Amount) ?? 0m)
            })
            .GroupBy(item => item.Currency)
            .Select(group => new
            {
                Currency = group.Key,
                Balance = group.Sum(item => item.Balance > 0m ? item.Balance : 0m)
            })
            .ToListAsync(cancellationToken);

        var revenueTrends = await periodPayments
            .Where(payment => payment.PaymentStatus == PaymentStatuses.Completed)
            .GroupBy(payment => new
            {
                LocalPaymentDate = EF.Functions.AtTimeZone(
                    EF.Functions.AtTimeZone(payment.PaymentDate, "UTC"),
                    "India Standard Time"),
                payment.Booking.Currency
            })
            .Select(group => new
            {
                Year = group.Key.LocalPaymentDate.Year,
                Month = group.Key.LocalPaymentDate.Month,
                group.Key.Currency,
                Revenue = group.Sum(payment =>
                    payment.PaymentType == PaymentTypes.Refund
                        ? -payment.Amount
                        : payment.Amount)
            })
            .OrderBy(item => item.Year)
            .ThenBy(item => item.Month)
            .ThenBy(item => item.Currency)
            .ToListAsync(cancellationToken);

        var recentBookings = await bookings
            .OrderByDescending(booking => booking.CreatedAt)
            .ThenByDescending(booking => booking.BookingId)
            .Select(booking => new DashboardRecentBookingDto(
                booking.BookingNumber,
                booking.Customer.FullName,
                booking.TravelPackage.PackageName,
                booking.TravelStartDate,
                booking.BookingStatus,
                booking.TotalAmount,
                booking.Currency))
            .Take(8)
            .ToListAsync(cancellationToken);

        var recentPayments = await periodPayments
            .OrderByDescending(payment => payment.PaymentDate)
            .ThenByDescending(payment => payment.PaymentId)
            .Select(payment => new DashboardRecentPaymentDto(
                payment.PaymentDate,
                payment.Booking.BookingNumber,
                payment.Booking.Customer.FullName,
                payment.Amount,
                payment.Booking.Currency,
                payment.PaymentMethod,
                payment.PaymentStatus))
            .Take(8)
            .ToListAsync(cancellationToken);

        var upcomingTripItems = await upcomingTripsQuery
            .OrderBy(booking => booking.TravelStartDate)
            .ThenBy(booking => booking.BookingId)
            .Select(booking => new DashboardUpcomingTripDto(
                booking.Customer.FullName,
                booking.TravelPackage.PackageName,
                booking.TravelStartDate,
                booking.TravelEndDate,
                booking.BookingStatus))
            .Take(8)
            .ToListAsync(cancellationToken);

        var followUpsDueToday = await ApplyFollowUpAccess(
                _context.FollowUps.AsNoTracking(), userId, isAdmin)
            .Where(followUp => followUp.IsActive &&
                followUp.Status == FollowUpStatuses.Pending &&
                followUp.ScheduledAt >= todayStartUtc &&
                followUp.ScheduledAt < tomorrowStartUtc)
            .OrderBy(followUp => followUp.ScheduledAt)
            .ThenBy(followUp => followUp.FollowUpId)
            .Select(followUp => new DashboardFollowUpDto(
                followUp.Lead.FullName,
                followUp.ScheduledAt,
                followUp.FollowUpType,
                followUp.AssignedToUser.FullName,
                followUp.Status))
            .Take(8)
            .ToListAsync(cancellationToken);

        var financials = financialByCurrency
            .Select(item => item.Currency)
            .Concat(outstandingByCurrency.Select(item => item.Currency))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(currency =>
            {
                var period = financialByCurrency.FirstOrDefault(item =>
                    string.Equals(item.Currency, currency, StringComparison.OrdinalIgnoreCase));
                var outstanding = outstandingByCurrency.FirstOrDefault(item =>
                    string.Equals(item.Currency, currency, StringComparison.OrdinalIgnoreCase));
                return new DashboardFinancialCurrencyDto(
                    currency,
                    period?.Revenue ?? 0m,
                    outstanding?.Balance ?? 0m,
                    period?.Refunded ?? 0m,
                    period?.Pending ?? 0m);
            })
            .OrderBy(item => item.Currency)
            .ToArray();

        return new DashboardSummaryDto(
            fromDate,
            toDate,
            bookingStatusCounts.Values.Sum(),
            GetCount(bookingStatusCounts, BookingStatuses.Confirmed),
            GetCount(bookingStatusCounts, BookingStatuses.Pending),
            GetCount(bookingStatusCounts, BookingStatuses.Cancelled),
            upcomingTripsCount,
            GetCount(bookingStatusCounts, BookingStatuses.Completed),
            totalCustomers,
            newCustomers,
            totalLeads,
            GetCount(leadStatusCounts, LeadStatuses.New),
            GetCount(leadStatusCounts, LeadStatuses.Qualified),
            convertedLeads,
            totalLeads == 0 ? 0m : decimal.Round(convertedLeads * 100m / totalLeads, 2),
            financials,
            bookingTrends
                .Select(item => new MonthlyBookingTrendDto(
                    $"{item.Year:D4}-{item.Month:D2}",
                    item.Count))
                .ToArray(),
            revenueTrends
                .Select(item => new MonthlyRevenueTrendDto(
                    $"{item.Year:D4}-{item.Month:D2}",
                    item.Currency,
                    item.Revenue))
                .ToArray(),
            bookingStatusDistribution
                .Select(item => new BookingStatusCountDto(item.Status, item.Count))
                .ToArray(),
            popularPackageDtos,
            new LeadConversionFunnelDto(
                GetCount(leadStatusCounts, LeadStatuses.New),
                GetCount(leadStatusCounts, LeadStatuses.Contacted),
                GetCount(leadStatusCounts, LeadStatuses.Qualified),
                convertedLeads),
            recentBookings,
            recentPayments,
            upcomingTripItems,
            followUpsDueToday);
    }

    private static int GetCount(IReadOnlyDictionary<string, int> counts, string status) =>
        counts.TryGetValue(status, out var count) ? count : 0;

    private static IQueryable<Booking> ApplyBookingAccess(
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

    private static IQueryable<Customer> ApplyCustomerAccess(
        IQueryable<Customer> query,
        int userId,
        bool isAdmin) =>
        isAdmin ? query : query.Where(customer => customer.CreatedByUserId == userId);

    private static IQueryable<Lead> ApplyLeadAccess(
        IQueryable<Lead> query,
        int userId,
        bool isAdmin) =>
        isAdmin
            ? query
            : query.Where(lead =>
                lead.CreatedByUserId == userId || lead.AssignedToUserId == userId);

    private static IQueryable<Payment> ApplyPaymentAccess(
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

    private static IQueryable<FollowUp> ApplyFollowUpAccess(
        IQueryable<FollowUp> query,
        int userId,
        bool isAdmin) =>
        isAdmin
            ? query
            : query.Where(followUp =>
                followUp.AssignedToUserId == userId ||
                followUp.Lead.CreatedByUserId == userId ||
                followUp.Lead.AssignedToUserId == userId);
}
