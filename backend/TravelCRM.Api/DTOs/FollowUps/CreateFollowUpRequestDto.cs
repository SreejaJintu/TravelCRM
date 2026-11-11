using System.ComponentModel.DataAnnotations;

namespace TravelCRM.Api.DTOs.FollowUps;

/// <summary>Information required to schedule a follow-up for an accessible lead.</summary>
public sealed record CreateFollowUpRequestDto
{
    [Range(1, int.MaxValue)]
    public int LeadId { get; init; }

    [Range(1, int.MaxValue)]
    public int? AssignedToUserId { get; init; }

    [Required]
    [RegularExpression("^(Call|WhatsApp|Email|Meeting|Other)$")]
    public required string FollowUpType { get; init; }

    [Required, StringLength(150)]
    public required string Subject { get; init; }

    [StringLength(1000)]
    public string? Description { get; init; }

    [Required]
    public DateTimeOffset ScheduledAt { get; init; }
}