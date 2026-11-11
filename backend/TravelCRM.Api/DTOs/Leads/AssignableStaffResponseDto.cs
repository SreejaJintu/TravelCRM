namespace TravelCRM.Api.DTOs.Leads;

/// <summary>An active Staff account eligible for lead assignment.</summary>
public sealed record AssignableStaffResponseDto(
    int UserId,
    string FullName,
    string Email);