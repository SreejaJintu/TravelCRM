namespace TravelCRM.Api.DTOs.Leads;

/// <summary>A page of leads and pagination metadata.</summary>
public sealed record PagedLeadsResponseDto<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);