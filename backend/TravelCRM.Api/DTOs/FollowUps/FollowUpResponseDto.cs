namespace TravelCRM.Api.DTOs.FollowUps;

/// <summary>Follow-up details, related lead information, and audit metadata.</summary>
public sealed record FollowUpResponseDto(
    int FollowUpId,
    int LeadId,
    string LeadNumber,
    string LeadName,
    string Destination,
    int AssignedToUserId,
    string AssignedToName,
    string FollowUpType,
    string Subject,
    string? Description,
    DateTimeOffset ScheduledAt,
    string Status,
    string? Outcome,
    DateTimeOffset? CompletedAt,
    int CreatedByUserId,
    string CreatedByName,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    bool IsActive);