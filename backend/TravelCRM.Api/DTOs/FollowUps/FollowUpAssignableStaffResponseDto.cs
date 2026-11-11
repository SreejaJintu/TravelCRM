namespace TravelCRM.Api.DTOs.FollowUps;

/// <summary>An active Staff account eligible for follow-up assignment.</summary>
public sealed record FollowUpAssignableStaffResponseDto(
    int UserId,
    string FullName,
    string Email);