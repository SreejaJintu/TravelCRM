using TravelCRM.Api.Models;

namespace TravelCRM.Api.Repositories.Interfaces;

public interface IFollowUpRepository
{
    Task<(IReadOnlyList<FollowUp> Items, int TotalCount)> GetPagedAsync(
        int userId,
        bool isAdmin,
        string? search,
        int? leadId,
        int? assignedToUserId,
        string? status,
        DateTimeOffset? from,
        DateTimeOffset? to,
        FollowUpWindow window,
        DateTimeOffset now,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<FollowUp?> GetByIdAsync(
        int followUpId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<bool> IsActiveStaffAsync(int userId, CancellationToken cancellationToken);

    Task AddAsync(FollowUp followUp, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}