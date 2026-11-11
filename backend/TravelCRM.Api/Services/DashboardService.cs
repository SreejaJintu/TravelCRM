using TravelCRM.Api.DTOs.Dashboard;
using TravelCRM.Api.Repositories.Interfaces;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Services;

public sealed class DashboardService : IDashboardService
{
    private static readonly TimeZoneInfo BusinessTimeZone = ResolveBusinessTimeZone();
    private readonly IDashboardRepository _dashboardRepository;

    public DashboardService(IDashboardRepository dashboardRepository)
    {
        _dashboardRepository = dashboardRepository;
    }

    public Task<DashboardSummaryDto> GetSummaryAsync(
        int userId,
        bool isAdmin,
        DateOnly? fromDate,
        DateOnly? toDate,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, BusinessTimeZone).DateTime);
        var from = fromDate ?? new DateOnly(today.Year, today.Month, 1);
        var to = toDate ?? today;

        if (from > to)
        {
            throw new ArgumentException("The from date must be on or before the to date.");
        }

        var fromUtc = LocalDateStartUtc(from);
        var toUtc = LocalDateStartUtc(to.AddDays(1));
        var todayStartUtc = new DateTimeOffset(LocalDateStartUtc(today), TimeSpan.Zero);
        var tomorrowStartUtc = new DateTimeOffset(LocalDateStartUtc(today.AddDays(1)), TimeSpan.Zero);

        return _dashboardRepository.GetSummaryAsync(
            userId,
            isAdmin,
            from,
            to,
            fromUtc,
            toUtc,
            today,
            todayStartUtc,
            tomorrowStartUtc,
            cancellationToken);
    }

    private static DateTime LocalDateStartUtc(DateOnly date)
    {
        var localDateTime = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(localDateTime, BusinessTimeZone);
    }

    private static TimeZoneInfo ResolveBusinessTimeZone()
    {
        var timeZoneId = OperatingSystem.IsWindows()
            ? "India Standard Time"
            : "Asia/Kolkata";
        return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
    }
}
