namespace TravelCRM.Api.DTOs.Customers;

/// <summary>A page of customer records and pagination metadata.</summary>
public sealed record PagedResponseDto<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);