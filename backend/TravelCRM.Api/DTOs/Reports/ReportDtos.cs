namespace TravelCRM.Api.DTOs.Reports;

/// <summary>Filter criteria shared across date-range reports.</summary>
public class ReportDateRangeFilter
{
    public DateOnly? FromDate { get; init; }
    public DateOnly? ToDate { get; init; }
}

/// <summary>Common report metadata included in every report response.</summary>
public sealed record ReportMetaDto(
    string ReportTitle,
    string GeneratedAtUtc,
    string GeneratedBy,
    string? FromDate,
    string? ToDate);

/// <summary>Single booking row for the Booking Report.</summary>
public sealed record BookingReportRowDto(
    string BookingNumber,
    string CustomerName,
    string PackageName,
    string Destination,
    DateOnly TravelStartDate,
    decimal TotalAmount,
    string Currency,
    string BookingStatus);

/// <summary>Booking Report response.</summary>
public sealed record BookingReportResponseDto(
    ReportMetaDto Meta,
    IReadOnlyList<BookingReportRowDto> Bookings,
    int TotalCount,
    decimal TotalAmount);

/// <summary>Filter criteria for the Payment Report.</summary>
public sealed class PaymentReportFilter : ReportDateRangeFilter
{
    public string? PaymentStatus { get; init; }
    public string? PaymentMethod { get; init; }
}

/// <summary>Single payment row for the Payment Report.</summary>
public sealed record PaymentReportRowDto(
    int PaymentId,
    string BookingNumber,
    string CustomerName,
    decimal Amount,
    string Currency,
    string PaymentType,
    string PaymentMethod,
    string PaymentStatus,
    DateTimeOffset PaymentDate);

/// <summary>Payment Report response.</summary>
public sealed record PaymentReportResponseDto(
    ReportMetaDto Meta,
    IReadOnlyList<PaymentReportRowDto> Payments,
    int TotalCount,
    decimal TotalAmount,
    decimal CompletedAmount,
    decimal PendingAmount,
    decimal FailedAmount);

/// <summary>Revenue Report summary.</summary>
public sealed record RevenueReportSummaryDto(
    decimal GrossPayments,
    decimal CompletedRefunds,
    decimal NetCollections,
    string Currency);

/// <summary>Revenue Report response.</summary>
public sealed record RevenueReportResponseDto(
    ReportMetaDto Meta,
    IReadOnlyList<RevenueReportSummaryDto> RevenueByCurrency,
    decimal TotalGrossPayments,
    decimal TotalCompletedRefunds,
    decimal TotalNetCollections);

/// <summary>Single customer row for the Customer Report.</summary>
public sealed record CustomerReportRowDto(
    int CustomerId,
    string FullName,
    string Email,
    string Phone,
    string Gender,
    int TotalBookings,
    decimal TotalSpent,
    string LastBookingNumber,
    string LastBookingStatus);

/// <summary>Customer Report response.</summary>
public sealed record CustomerReportResponseDto(
    ReportMetaDto Meta,
    IReadOnlyList<CustomerReportRowDto> Customers,
    int TotalCount);

/// <summary>Lead Conversion Report summary.</summary>
public sealed record LeadConversionReportSummaryDto(
    int TotalLeads,
    int ConvertedLeads,
    int PendingLeads,
    decimal ConversionPercentage);

/// <summary>Lead Conversion Report response.</summary>
public sealed record LeadConversionReportResponseDto(
    ReportMetaDto Meta,
    LeadConversionReportSummaryDto Summary,
    IReadOnlyList<LeadConversionReportRowDto> Leads);

/// <summary>Single lead row for the Lead Conversion Report.</summary>
public sealed record LeadConversionReportRowDto(
    string LeadNumber,
    string FullName,
    string Phone,
    string? Email,
    string Destination,
    string LeadStatus,
    bool IsConverted,
    string? ConvertedCustomerName,
    DateTime? ConvertedAt);
