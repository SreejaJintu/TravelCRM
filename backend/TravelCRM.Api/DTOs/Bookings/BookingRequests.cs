using System.ComponentModel.DataAnnotations;
using TravelCRM.Api.Models;
using TravelCRM.Api.DTOs.Payments;

namespace TravelCRM.Api.DTOs.Bookings;

public class BookingDetailsRequestDto : IValidatableObject
{
    [Range(1, int.MaxValue)]
    public int TravelPackageId { get; init; }

    public DateOnly TravelStartDate { get; init; }

    public DateOnly TravelEndDate { get; init; }

    [Range(0, 100)]
    public int NumberOfAdults { get; init; }

    [Range(0, 100)]
    public int NumberOfChildren { get; init; }

    [Range(0, 100)]
    public int NumberOfInfants { get; init; }

    [Range(typeof(decimal), "0", "9999999999999999.99")]
    public decimal DiscountAmount { get; init; }

    [Range(typeof(decimal), "0", "9999999999999999.99")]
    public decimal AdditionalCharges { get; init; }

    [StringLength(2000)]
    public string? SpecialRequests { get; init; }

    public IReadOnlyList<BookingTravelerRequestDto>? Travelers { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (TravelStartDate == default)
        {
            yield return new ValidationResult("A travel start date is required.", [nameof(TravelStartDate)]);
        }

        if (TravelEndDate == default || TravelEndDate < TravelStartDate)
        {
            yield return new ValidationResult("The travel end date must be on or after the start date.", [nameof(TravelEndDate)]);
        }

        if (NumberOfAdults + NumberOfChildren + NumberOfInfants is < 1 or > 100)
        {
            yield return new ValidationResult("The booking must have between 1 and 100 travelers.");
        }
    }
}

public sealed class CreateBookingRequestDto : BookingDetailsRequestDto
{
    [Range(1, int.MaxValue)]
    public int CustomerId { get; init; }

    [Range(1, int.MaxValue)]
    public int? LeadId { get; init; }

    [Range(1, int.MaxValue)]
    public int? AssignedToUserId { get; init; }
}

public sealed class UpdateBookingRequestDto : BookingDetailsRequestDto
{
}

public sealed class CreateBookingFromLeadRequestDto : BookingDetailsRequestDto
{
    [Range(1, int.MaxValue)]
    public int? AssignedToUserId { get; init; }
}

public sealed record ChangeBookingStatusRequestDto
{
    [Required, StringLength(20)]
    public required string Status { get; init; }
}

public sealed record AssignBookingRequestDto
{
    [Range(1, int.MaxValue)]
    public int? AssignedToUserId { get; init; }
}

public sealed record BookingTravelerRequestDto
{
    [Required, StringLength(150)]
    public required string FullName { get; init; }

    public DateOnly? DateOfBirth { get; init; }

    [StringLength(20)]
    public string? Gender { get; init; }

    [Required, RegularExpression("^(Adult|Child|Infant)$")]
    public required string TravelerType { get; init; }
}

public sealed record PagedBookingsResponseDto<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

public sealed record AssignableBookingStaffResponseDto(int UserId, string FullName, string Email);

public sealed record BookingSummaryDto(
    int BookingId,
    string BookingNumber,
    int CustomerId,
    string CustomerName,
    int TravelPackageId,
    string PackageName,
    string Destination,
    DateOnly TravelStartDate,
    DateOnly TravelEndDate,
    int NumberOfAdults,
    int NumberOfChildren,
    int NumberOfInfants,
    decimal TotalAmount,
    string Currency,
    string BookingStatus,
    BookingPaymentSummaryDto PaymentSummary,
    int? AssignedToUserId,
    string? AssignedToName,
    DateTime CreatedAt,
    bool IsActive);

public sealed record BookingTravelerResponseDto(
    int BookingTravelerId,
    string FullName,
    DateOnly? DateOfBirth,
    string? Gender,
    string TravelerType);

public sealed record BookingDetailsDto(
    int BookingId,
    string BookingNumber,
    int CustomerId,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    int? LeadId,
    string? LeadNumber,
    int TravelPackageId,
    string PackageName,
    string Destination,
    string Country,
    DateOnly TravelStartDate,
    DateOnly TravelEndDate,
    int NumberOfAdults,
    int NumberOfChildren,
    int NumberOfInfants,
    decimal AdultPrice,
    decimal ChildPrice,
    decimal InfantPrice,
    decimal BaseAmount,
    decimal DiscountAmount,
    decimal AdditionalCharges,
    decimal TotalAmount,
    string Currency,
    string BookingStatus,
    string? SpecialRequests,
    int? AssignedToUserId,
    string? AssignedToName,
    IReadOnlyList<BookingTravelerResponseDto> Travelers,
    BookingPaymentSummaryDto PaymentSummary,
    int CreatedByUserId,
    string CreatedByName,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    bool IsActive);
