using System.ComponentModel.DataAnnotations;

namespace TravelCRM.Api.DTOs.FollowUps;

/// <summary>Request to assign a follow-up to an active Staff account.</summary>
public sealed record AssignFollowUpRequestDto
{
    [Range(1, int.MaxValue)]
    public int AssignedToUserId { get; init; }
}