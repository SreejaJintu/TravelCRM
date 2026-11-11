using TravelCRM.Api.DTOs.Reports;
using TravelCRM.Api.Models;

namespace TravelCRM.Api.Repositories.Interfaces;

public interface IReportRepository
{
    Task<(IReadOnlyList<Booking> Items, int TotalCount)> GetBookingsForReportAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        string? status,
        CancellationToken cancellationToken);

    Task<(IReadOnlyList<Payment> Items, int TotalCount)> GetPaymentsForReportAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        string? paymentStatus,
        string? paymentMethod,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<Payment>> GetAllPaymentsForRevenueAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        CancellationToken cancellationToken);

    Task<(IReadOnlyList<Customer> Items, int TotalCount)> GetCustomersForReportAsync(
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<Lead>> GetLeadsForConversionReportAsync(
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);
}
