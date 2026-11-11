using TravelCRM.Api.Models;

namespace TravelCRM.Api.Repositories.Interfaces;

public interface IBookingRepository
{
    Task<(IReadOnlyList<Booking> Items, int TotalCount)> GetPagedAsync(
        int userId,
        bool isAdmin,
        string? search,
        string? status,
        DateOnly? travelStartFrom,
        DateOnly? travelStartTo,
        int page,
        int pageSize,
        int? customerId,
        int? travelPackageId,
        CancellationToken cancellationToken);

    Task<Booking?> GetByIdAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        bool tracked,
        CancellationToken cancellationToken);

    Task<Customer?> GetActiveCustomerAsync(
        int customerId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<TravelPackage?> GetActivePackageAsync(int travelPackageId, CancellationToken cancellationToken);

    Task<Lead?> GetAccessibleLeadAsync(
        int leadId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<User>> GetAssignableStaffAsync(CancellationToken cancellationToken);

    Task<bool> IsAssignableStaffAsync(int userId, CancellationToken cancellationToken);

    Task AddAsync(Booking booking, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task<BookingOperationResult<Booking>> CreateFromLeadAsync(
        int leadId,
        int userId,
        bool isAdmin,
        int actingUserId,
        int? assignedToUserId,
        Booking booking,
        CancellationToken cancellationToken);
}
