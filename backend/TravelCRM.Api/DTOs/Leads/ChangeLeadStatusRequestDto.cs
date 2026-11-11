using System.ComponentModel.DataAnnotations;

namespace TravelCRM.Api.DTOs.Leads;

/// <summary>Request to set a lead's workflow status without converting it.</summary>
public sealed record ChangeLeadStatusRequestDto
{
    [Required]
    [RegularExpression("^(New|Contacted|Qualified|ProposalSent|Negotiation|Lost)$")]
    public required string Status { get; init; }
}