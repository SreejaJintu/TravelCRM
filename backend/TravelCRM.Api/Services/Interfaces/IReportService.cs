using TravelCRM.Api.DTOs.Reports;

namespace TravelCRM.Api.Services.Interfaces;

public interface IReportService
{
    Task<BookingReportResponseDto> GetBookingReportAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        string? status,
        CancellationToken cancellationToken);

    Task<PaymentReportResponseDto> GetPaymentReportAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        string? paymentStatus,
        string? paymentMethod,
        CancellationToken cancellationToken);

    Task<RevenueReportResponseDto> GetRevenueReportAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        CancellationToken cancellationToken);

    Task<CustomerReportResponseDto> GetCustomerReportAsync(
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<LeadConversionReportResponseDto> GetLeadConversionReportAsync(
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);
}
