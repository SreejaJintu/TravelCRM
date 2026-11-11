using System.ComponentModel.DataAnnotations;

namespace TravelCRM.Api.DTOs.Leads;

/// <summary>Request to assign a lead to an active Staff account or clear its assignment.</summary>
public sealed record AssignLeadRequestDto
{
    [Range(1, int.MaxValue)]
    public int? AssignedToUserId { get; init; }
}