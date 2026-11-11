namespace TravelCRM.Api.DTOs.Dashboard;

/// <summary>Dashboard metrics, chart series, and recent activity for the requested period.</summary>
/// <remarks>
/// Booking counts, booking trends, package popularity, and recent bookings use Booking.CreatedAt.
/// Customer and lead additions use their respective CreatedAt fields. Revenue, refunds, pending
/// payments, and recent payments use Payment.PaymentDate. Outstanding balance is the current
/// balance of bookings created in the requested period. Upcoming trips use TravelStartDate within
/// the requested period and after the current business-local date. Follow-ups are due today in the
/// business timezone, regardless of the selected date range. Financial amounts are grouped by
/// currency.
/// </remarks>
public sealed record DashboardSummaryDto(
    DateOnly FromDate,
    DateOnly ToDate,
    int TotalBookings,
    int ConfirmedBookings,
    int PendingBookings,
    int CancelledBookings,
    int UpcomingTrips,
    int CompletedTrips,
    int TotalCustomers,
    int NewCustomers,
    int TotalLeads,
    int NewLeads,
    int QualifiedLeads,
    int ConvertedLeads,
    decimal ConversionRate,
    IReadOnlyList<DashboardFinancialCurrencyDto> Financials,
    IReadOnlyList<MonthlyBookingTrendDto> BookingTrends,
    IReadOnlyList<MonthlyRevenueTrendDto> RevenueTrends,
    IReadOnlyList<BookingStatusCountDto> BookingStatusDistribution,
    IReadOnlyList<PopularPackageDto> PopularPackages,
    LeadConversionFunnelDto LeadFunnel,
    IReadOnlyList<DashboardRecentBookingDto> RecentBookings,
    IReadOnlyList<DashboardRecentPaymentDto> RecentPayments,
    IReadOnlyList<DashboardUpcomingTripDto> UpcomingTripsList,
    IReadOnlyList<DashboardFollowUpDto> FollowUpsDueToday);

/// <summary>Period financial metrics grouped by currency to avoid mixing currencies.</summary>
public sealed record DashboardFinancialCurrencyDto(
    string Currency,
    decimal TotalRevenueReceived,
    decimal OutstandingBalance,
    decimal TotalRefunded,
    decimal PendingPayments);

/// <summary>Booking count for a calendar month, keyed as YYYY-MM.</summary>
public sealed record MonthlyBookingTrendDto(string Month, int TotalBookings);

/// <summary>Net completed receipts for a calendar month and currency.</summary>
public sealed record MonthlyRevenueTrendDto(string Month, string Currency, decimal RevenueReceived);

/// <summary>Count of bookings in a persisted booking status.</summary>
public sealed record BookingStatusCountDto(string BookingStatus, int Count);

/// <summary>Booking volume for a travel package.</summary>
public sealed record PopularPackageDto(string PackageName, int BookingCount);

/// <summary>Lead counts at the four principal conversion stages.</summary>
public sealed record LeadConversionFunnelDto(
    int NewLeads,
    int ContactedLeads,
    int QualifiedLeads,
    int ConvertedLeads);

/// <summary>Recent booking data displayed on the dashboard.</summary>
public sealed record DashboardRecentBookingDto(
    string BookingNumber,
    string CustomerName,
    string PackageName,
    DateOnly TravelStartDate,
    string BookingStatus,
    decimal BookingTotal,
    string Currency);

/// <summary>Recent payment data displayed on the dashboard.</summary>
public sealed record DashboardRecentPaymentDto(
    DateTimeOffset PaymentDate,
    string BookingNumber,
    string CustomerName,
    decimal Amount,
    string Currency,
    string PaymentMethod,
    string PaymentStatus);

/// <summary>Upcoming trip data displayed on the dashboard.</summary>
public sealed record DashboardUpcomingTripDto(
    string CustomerName,
    string PackageName,
    DateOnly TravelStartDate,
    DateOnly TravelEndDate,
    string BookingStatus);

/// <summary>Follow-up scheduled for today, including its assigned staff member.</summary>
public sealed record DashboardFollowUpDto(
    string CustomerName,
    DateTimeOffset FollowUpDate,
    string FollowUpType,
    string AssignedStaff,
    string FollowUpStatus);
