namespace TravelCRM.Api.Models;

public static class LeadStatuses
{
    public const string New = "New";
    public const string Contacted = "Contacted";
    public const string Qualified = "Qualified";
    public const string ProposalSent = "ProposalSent";
    public const string Negotiation = "Negotiation";
    public const string Converted = "Converted";
    public const string Lost = "Lost";

    public static bool IsValid(string value)
    {
        return value is New or Contacted or Qualified or ProposalSent or Negotiation or Converted or Lost;
    }

    public static bool CanBeSetDirectly(string value)
    {
        return IsValid(value) && value != Converted;
    }
}

public class Lead
{
    public int LeadId { get; set; }

    public string LeadNumber { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string Destination { get; set; } = string.Empty;

    public DateOnly? TravelStartDate { get; set; }

    public DateOnly? TravelEndDate { get; set; }

    public int NumberOfAdults { get; set; } = 1;

    public int NumberOfChildren { get; set; }

    public decimal? Budget { get; set; }

    public string LeadSource { get; set; } = string.Empty;

    public string LeadStatus { get; set; } = LeadStatuses.New;

    public string? Notes { get; set; }

    public int? AssignedToUserId { get; set; }

    public User? AssignedToUser { get; set; }

    public int CreatedByUserId { get; set; }

    public User CreatedByUser { get; set; } = null!;

    public int? ConvertedCustomerId { get; set; }

    public Customer? ConvertedCustomer { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public DateTime? ConvertedAt { get; set; }

    public bool IsActive { get; set; } = true;
}