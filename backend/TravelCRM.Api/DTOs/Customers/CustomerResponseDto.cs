namespace TravelCRM.Api.DTOs.Customers;

/// <summary>Customer record returned by the API.</summary>
public sealed record CustomerResponseDto(
    int CustomerId,
    string FullName,
    string Email,
    string Phone,
    DateOnly? DateOfBirth,
    string? Gender,
    string? Address,
    int CreatedByUserId,
    string CreatedByName,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    bool IsActive);