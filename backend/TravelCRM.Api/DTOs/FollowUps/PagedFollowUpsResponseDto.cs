namespace TravelCRM.Api.DTOs.FollowUps;

/// <summary>A page of follow-ups and pagination metadata.</summary>
public sealed record PagedFollowUpsResponseDto<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);