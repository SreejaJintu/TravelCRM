using System.ComponentModel.DataAnnotations;

namespace TravelCRM.Api.DTOs.FollowUps;

/// <summary>Outcome recorded when completing a follow-up.</summary>
public sealed record CompleteFollowUpRequestDto
{
    [Required, StringLength(1000)]
    public required string Outcome { get; init; }
}