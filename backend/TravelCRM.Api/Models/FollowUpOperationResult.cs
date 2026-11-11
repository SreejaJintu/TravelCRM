namespace TravelCRM.Api.Models;

public enum FollowUpOperationStatus
{
    Success,
    NotFound,
    Forbidden,
    InvalidLead,
    InvalidAssignee,
    InvalidFilter,
    Conflict
}

public sealed record FollowUpOperationResult<T>(
    FollowUpOperationStatus Status,
    T? Value = default);

public enum FollowUpWindow
{
    All,
    Today,
    Overdue,
    Upcoming
}