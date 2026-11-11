namespace TravelCRM.Api.DTOs.Leads;

/// <summary>Result of converting a lead into a new or existing customer.</summary>
public sealed record LeadConversionResponseDto(
    int LeadId,
    string LeadNumber,
    string LeadStatus,
    int CustomerId,
    bool CreatedCustomer,
    string Message);