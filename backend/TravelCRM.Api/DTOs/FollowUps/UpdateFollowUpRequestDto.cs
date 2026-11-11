using System.ComponentModel.DataAnnotations;

namespace TravelCRM.Api.DTOs.FollowUps;

/// <summary>Editable follow-up details; assignment and audit ownership are managed separately.</summary>
public sealed record UpdateFollowUpRequestDto
{
    [Range(1, int.MaxValue)]
    public int LeadId { get; init; }

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