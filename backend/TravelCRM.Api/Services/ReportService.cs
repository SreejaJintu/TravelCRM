using Microsoft.EntityFrameworkCore;
using TravelCRM.Api.Data;
using TravelCRM.Api.DTOs.Reports;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Services;

public sealed class ReportService : IReportService
{
    private readonly IReportRepository _reportRepository;
    private readonly ApplicationDbContext _context;

    public ReportService(
        IReportRepository reportRepository,
        ApplicationDbContext context)
    {
        _reportRepository = reportRepository;
        _context = context;
    }

    public async Task<BookingReportResponseDto> GetBookingReportAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        string? status,
        CancellationToken cancellationToken)
    {
        var (bookings, totalCount) = await _reportRepository.GetBookingsForReportAsync(
            userId, isAdmin, fromDate, toDate, status, cancellationToken);

        var rows = bookings.Select(booking => new BookingReportRowDto(
            booking.BookingNumber,
            booking.Customer.FullName,
            booking.TravelPackage.PackageName,
            booking.TravelPackage.Destination,
            booking.TravelStartDate,
            booking.TotalAmount,
            booking.Currency,
            booking.BookingStatus)).ToList();

        var totalAmount = rows.Sum(row => row.TotalAmount);

        return new BookingReportResponseDto(
            CreateMeta("Booking Report", fromDate, toDate, userId),
            rows,
            totalCount,
            totalAmount);
    }

    public async Task<PaymentReportResponseDto> GetPaymentReportAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        string? paymentStatus,
        string? paymentMethod,
        CancellationToken cancellationToken)
    {
        var (payments, totalCount) = await _reportRepository.GetPaymentsForReportAsync(
            userId, isAdmin, fromDate, toDate, paymentStatus, paymentMethod, cancellationToken);

        var rows = payments.Select(payment => new PaymentReportRowDto(
            payment.PaymentId,
            payment.Booking.BookingNumber,
            payment.Booking.Customer.FullName,
            payment.Amount,
            payment.Booking.Currency,
            payment.PaymentType,
            payment.PaymentMethod,
            payment.PaymentStatus,
            payment.PaymentDate)).ToList();

        var totalAmount = rows.Sum(row => row.Amount);
        var completedAmount = rows.Where(row => row.PaymentStatus == PaymentStatuses.Completed).Sum(row => row.Amount);
        var pendingAmount = rows.Where(row => row.PaymentStatus == PaymentStatuses.Pending).Sum(row => row.Amount);
        var failedAmount = rows.Where(row => row.PaymentStatus == PaymentStatuses.Failed).Sum(row => row.Amount);

        return new PaymentReportResponseDto(
            CreateMeta("Payment Report", fromDate, toDate, userId),
            rows,
            totalCount,
            totalAmount,
            completedAmount,
            pendingAmount,
            failedAmount);
    }

    public async Task<RevenueReportResponseDto> GetRevenueReportAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        CancellationToken cancellationToken)
    {
        var payments = await _reportRepository.GetAllPaymentsForRevenueAsync(
            userId, isAdmin, fromDate, toDate, cancellationToken);

        var byCurrency = payments
            .GroupBy(payment => payment.Booking.Currency)
            .Select(group => new RevenueReportSummaryDto(
                group.Where(p => p.PaymentType != PaymentTypes.Refund && p.PaymentStatus == PaymentStatuses.Completed).Sum(p => p.Amount),
                group.Where(p => p.PaymentType == PaymentTypes.Refund && p.PaymentStatus == PaymentStatuses.Completed).Sum(p => p.Amount),
                group.Where(p => p.PaymentType != PaymentTypes.Refund && p.PaymentStatus == PaymentStatuses.Completed).Sum(p => p.Amount) -
                group.Where(p => p.PaymentType == PaymentTypes.Refund && p.PaymentStatus == PaymentStatuses.Completed).Sum(p => p.Amount),
                group.Key))
            .ToList();

        var totalGrossPayments = byCurrency.Sum(x => x.GrossPayments);
        var totalCompletedRefunds = byCurrency.Sum(x => x.CompletedRefunds);
        var totalNetCollections = byCurrency.Sum(x => x.NetCollections);

        return new RevenueReportResponseDto(
            CreateMeta("Revenue Report", fromDate, toDate, userId),
            byCurrency,
            totalGrossPayments,
            totalCompletedRefunds,
            totalNetCollections);
    }

    public async Task<CustomerReportResponseDto> GetCustomerReportAsync(
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var (customers, totalCount) = await _reportRepository.GetCustomersForReportAsync(
            userId, isAdmin, cancellationToken);

        var rows = new List<CustomerReportRowDto>();
        foreach (var customer in customers)
        {
            var bookings = await GetBookingsForCustomer(customer.CustomerId, userId, isAdmin, cancellationToken);
            var totalSpent = bookings
                .Where(b => b.BookingStatus == BookingStatuses.Confirmed || b.BookingStatus == BookingStatuses.Completed)
                .Sum(b => b.TotalAmount);
            var lastBooking = bookings
                .OrderByDescending(b => b.CreatedAt)
                .FirstOrDefault();

            rows.Add(new CustomerReportRowDto(
                customer.CustomerId,
                customer.FullName,
                customer.Email,
                customer.Phone,
                customer.Gender ?? string.Empty,
                bookings.Count,
                totalSpent,
                lastBooking?.BookingNumber ?? string.Empty,
                lastBooking?.BookingStatus ?? string.Empty));
        }

        return new CustomerReportResponseDto(
            CreateMeta("Customer Report", null, null, userId),
            rows,
            totalCount);
    }

    public async Task<LeadConversionReportResponseDto> GetLeadConversionReportAsync(
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var leads = await _reportRepository.GetLeadsForConversionReportAsync(
            userId, isAdmin, cancellationToken);

        var totalLeads = leads.Count;
        var convertedLeads = leads.Count(l => l.LeadStatus == LeadStatuses.Converted);
        var pendingLeads = leads.Count(l => l.LeadStatus != LeadStatuses.Converted && l.LeadStatus != LeadStatuses.Lost);
        var conversionPercentage = totalLeads > 0
            ? Math.Round((decimal)convertedLeads / totalLeads * 100, 2)
            : 0m;

        var rows = leads.Select(lead => new LeadConversionReportRowDto(
            lead.LeadNumber,
            lead.FullName,
            lead.Phone,
            lead.Email,
            lead.Destination,
            lead.LeadStatus,
            lead.LeadStatus == LeadStatuses.Converted,
            lead.ConvertedCustomer?.FullName,
            lead.ConvertedAt)).ToList();

        return new LeadConversionReportResponseDto(
            CreateMeta("Lead Conversion Report", null, null, userId),
            new LeadConversionReportSummaryDto(totalLeads, convertedLeads, pendingLeads, conversionPercentage),
            rows);
    }

    private static ReportMetaDto CreateMeta(
        string reportTitle,
        DateOnly? fromDate,
        DateOnly? toDate,
        int userId) => new(
        reportTitle,
        DateTime.UtcNow.ToString("o"),
        $"User #{userId}",
        fromDate?.ToString("yyyy-MM-dd"),
        toDate?.ToString("yyyy-MM-dd"));

    private async Task<IReadOnlyList<Booking>> GetBookingsForCustomer(
        int customerId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        IQueryable<Booking> query = ApplyBookingAccessFilter(
            _context.Bookings.AsNoTracking(), userId, isAdmin);

        return await query
            .Where(booking => booking.CustomerId == customerId)
            .OrderByDescending(booking => booking.CreatedAt)
            .ToListAsync(cancellationToken);
    }

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