using System.ComponentModel.DataAnnotations;

namespace TravelCRM.Api.DTOs.Packages;

public record CreateTravelPackageRequestDto : IValidatableObject
{
    [Required, RegularExpression("^[A-Z0-9][A-Z0-9_-]{1,31}$")]
    public required string PackageCode { get; init; }

    [Required, StringLength(150)]
    public required string PackageName { get; init; }

    [Required, StringLength(150)]
    public required string Destination { get; init; }

    [Required, StringLength(100)]
    public required string Country { get; init; }

    [Required, StringLength(50)]
    public required string PackageType { get; init; }

    [Range(1, 365)]
    public int DurationDays { get; init; }

    [Range(0, 364)]
    public int DurationNights { get; init; }

    [Required, StringLength(4000)]
    public required string Description { get; init; }

    [Range(typeof(decimal), "0.01", "9999999999999999.99")]
    public decimal BasePrice { get; init; }

    [Range(typeof(decimal), "0.01", "9999999999999999.99")]
    public decimal AdultPrice { get; init; }

    [Range(typeof(decimal), "0", "9999999999999999.99")]
    public decimal ChildPrice { get; init; }

    [Range(typeof(decimal), "0", "9999999999999999.99")]
    public decimal InfantPrice { get; init; }

    [Required, RegularExpression("^[A-Z]{3}$")]
    public string Currency { get; init; } = "USD";

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (DurationNights > DurationDays)
        {
            yield return new ValidationResult("Nights cannot exceed days.", [nameof(DurationNights)]);
        }
    }
}

public sealed record UpdateTravelPackageRequestDto : CreateTravelPackageRequestDto;

public record CreateItineraryRequestDto
{
    [Range(1, 365)]
    public int DayNumber { get; init; }

    [Required, StringLength(150)]
    public required string Title { get; init; }

    [Required, StringLength(2000)]
    public required string Description { get; init; }

    [StringLength(200)]
    public string? Accommodation { get; init; }

    [StringLength(200)]
    public string? MealsIncluded { get; init; }
}

public sealed record UpdateItineraryRequestDto : CreateItineraryRequestDto;

public sealed record PackageDescriptionRequestDto
{
    [Required, StringLength(500)]
    public required string Description { get; init; }
}

public sealed record UpdateImageOrderRequestDto
{
    [Required, MinLength(1)]
    public required IReadOnlyList<PackageImageOrderDto> Images { get; init; }
}

public sealed record PackageImageOrderDto
{
    [Range(1, int.MaxValue)]
    public int PackageImageId { get; init; }

    [Range(0, int.MaxValue)]
    public int DisplayOrder { get; init; }
}

public sealed record PagedTravelPackagesResponseDto<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

public sealed record PackageImageResponseDto(
    int PackageImageId,
    string ImageUrl,
    int DisplayOrder,
    bool IsPrimary,
    DateTime CreatedAt,
    bool CleanupPending);

public sealed record PackageItineraryResponseDto(
    int ItineraryId,
    int DayNumber,
    string Title,
    string Description,
    string? Accommodation,
    string? MealsIncluded);

public sealed record PackageContentResponseDto(int Id, string Description);

public sealed record TravelPackageSummaryDto(
    int TravelPackageId,
    string PackageCode,
    string PackageName,
    string Destination,
    string Country,
    string PackageType,
    int DurationDays,
    int DurationNights,
    decimal BasePrice,
    decimal AdultPrice,
    decimal ChildPrice,
    decimal InfantPrice,
    string Currency,
    string? CoverImageUrl,
    bool IsActive);

public sealed record TravelPackageDetailsDto(
    int TravelPackageId,
    string PackageCode,
    string PackageName,
    string Destination,
    string Country,
    string PackageType,
    int DurationDays,
    int DurationNights,
    string Description,
    decimal BasePrice,
    decimal AdultPrice,
    decimal ChildPrice,
    decimal InfantPrice,
    string Currency,
    string? CoverImageUrl,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyList<PackageItineraryResponseDto> Itinerary,
    IReadOnlyList<PackageImageResponseDto> Images,
    IReadOnlyList<PackageContentResponseDto> Inclusions,
    IReadOnlyList<PackageContentResponseDto> Exclusions);
