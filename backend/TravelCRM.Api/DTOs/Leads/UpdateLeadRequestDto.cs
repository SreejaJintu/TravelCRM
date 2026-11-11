using System.ComponentModel.DataAnnotations;

namespace TravelCRM.Api.DTOs.Leads;

/// <summary>Editable travel lead details; ownership and assignment are managed separately.</summary>
public sealed record UpdateLeadRequestDto : IValidatableObject
{
    [Required, StringLength(150)]
    public required string FullName { get; init; }

    [Required, Phone, StringLength(20)]
    public required string Phone { get; init; }

    [EmailAddress, StringLength(150)]
    public string? Email { get; init; }

    [Required, StringLength(150)]
    public required string Destination { get; init; }

    public DateOnly? TravelStartDate { get; init; }

    public DateOnly? TravelEndDate { get; init; }

    [Range(1, 50)]
    public int NumberOfAdults { get; init; } = 1;

    [Range(0, 50)]
    public int NumberOfChildren { get; init; }

    [Range(typeof(decimal), "0", "999999999999.99")]
    public decimal? Budget { get; init; }

    [Required, StringLength(50)]
    public required string LeadSource { get; init; }

    [StringLength(1000)]
    public string? Notes { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (TravelStartDate.HasValue && TravelEndDate.HasValue && TravelEndDate < TravelStartDate)
        {
            yield return new ValidationResult(
                "Travel end date must be on or after the start date.",
                [nameof(TravelEndDate)]);
        }
    }
}