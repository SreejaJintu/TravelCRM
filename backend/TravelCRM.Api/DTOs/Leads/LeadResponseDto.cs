namespace TravelCRM.Api.DTOs.Leads;

/// <summary>Lead record and ownership details returned by the API.</summary>
public sealed record LeadResponseDto(
    int LeadId,
    string LeadNumber,
    string FullName,
    string Phone,
    string? Email,
    string Destination,
    DateOnly? TravelStartDate,
    DateOnly? TravelEndDate,
    int NumberOfAdults,
    int NumberOfChildren,
    decimal? Budget,
    string LeadSource,
    string LeadStatus,
    string? Notes,
    int? AssignedToUserId,
    string? AssignedToName,
    int CreatedByUserId,
    string CreatedByName,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    bool IsActive,
    int? ConvertedCustomerId,
    DateTimeOffset? ConvertedAt);