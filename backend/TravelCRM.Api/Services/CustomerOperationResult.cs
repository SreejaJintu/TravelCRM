namespace TravelCRM.Api.Services;

public enum CustomerOperationStatus
{
    Success,
    NotFound,
    EmailConflict
}

public sealed record CustomerOperationResult<T>(
    CustomerOperationStatus Status,
    T? Value = default);