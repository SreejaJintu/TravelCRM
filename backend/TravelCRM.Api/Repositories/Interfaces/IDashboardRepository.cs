using TravelCRM.Api.DTOs.Dashboard;

namespace TravelCRM.Api.Repositories.Interfaces;

public interface IDashboardRepository
{
    Task<DashboardSummaryDto> GetSummaryAsync(
        int userId,
        bool isAdmin,
        DateOnly fromDate,
        DateOnly toDate,
        DateTime fromUtc,
        DateTime toUtc,
        DateOnly today,
        DateTimeOffset todayStartUtc,
        DateTimeOffset tomorrowStartUtc,
        CancellationToken cancellationToken);
}
