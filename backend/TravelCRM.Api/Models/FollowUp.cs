namespace TravelCRM.Api.Models;

public static class FollowUpTypes
{
    public const string Call = "Call";
    public const string WhatsApp = "WhatsApp";
    public const string Email = "Email";
    public const string Meeting = "Meeting";
    public const string Other = "Other";

    public static bool IsValid(string value)
    {
        return value is Call or WhatsApp or Email or Meeting or Other;
    }
}

public static class FollowUpStatuses
{
    public const string Pending = "Pending";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";

    public static bool IsValid(string value)
    {
        return value is Pending or Completed or Cancelled;
    }
}

public class FollowUp
{
    public int FollowUpId { get; set; }

    public int LeadId { get; set; }

    public Lead Lead { get; set; } = null!;

    public int AssignedToUserId { get; set; }

    public User AssignedToUser { get; set; } = null!;

    public string FollowUpType { get; set; } = FollowUpTypes.Call;

    public string Subject { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTimeOffset ScheduledAt { get; set; }

    public string Status { get; set; } = FollowUpStatuses.Pending;

    public string? Outcome { get; set; }

    public DateTimeOffset? CompletedAt { get; set; }

    public int CreatedByUserId { get; set; }

    public User CreatedByUser { get; set; } = null!;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAt { get; set; }

    public bool IsActive { get; set; } = true;
}