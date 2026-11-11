using TravelCRM.Api.Models;

namespace TravelCRM.Api.Repositories.Interfaces;

public interface ILeadRepository
{
    Task<(IReadOnlyList<Lead> Items, int TotalCount)> GetPagedAsync(
        int userId,
        bool isAdmin,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<Lead?> GetByIdAsync(
        int leadId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<User>> GetAssignableStaffAsync(CancellationToken cancellationToken);

    Task<bool> IsAssignableStaffAsync(int userId, CancellationToken cancellationToken);

    Task AddAsync(Lead lead, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task<LeadConversionData> ConvertToCustomerAsync(
        int leadId,
        int userId,
        int actingUserId,
        bool isAdmin,
        CancellationToken cancellationToken);
}