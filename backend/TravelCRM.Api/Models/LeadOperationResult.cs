namespace TravelCRM.Api.Models;

public enum LeadOperationStatus
{
    Success,
    NotFound,
    Conflict,
    InvalidAssignee,
    EmailRequired,
    AmbiguousCustomer
}

public sealed record LeadOperationResult<T>(
    LeadOperationStatus Status,
    T? Value = default);

public sealed record LeadConversionData(
    LeadOperationStatus Status,
    int? CustomerId = null,
    bool CreatedCustomer = false);