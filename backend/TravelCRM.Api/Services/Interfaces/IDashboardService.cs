using TravelCRM.Api.DTOs.Dashboard;

namespace TravelCRM.Api.Services.Interfaces;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        CancellationToken cancellationToken);
}
