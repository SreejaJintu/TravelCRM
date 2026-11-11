using System.ComponentModel.DataAnnotations;

namespace TravelCRM.Api.DTOs.Customers;

/// <summary>Customer details required to create a customer record.</summary>
public sealed record CreateCustomerRequestDto
{
    [Required, StringLength(150)]
    public required string FullName { get; init; }

    [Required, EmailAddress, StringLength(150)]
    public required string Email { get; init; }

    [Required, Phone, StringLength(20)]
    public required string Phone { get; init; }

    public DateOnly? DateOfBirth { get; init; }

    [StringLength(20)]
    public string? Gender { get; init; }

    [StringLength(500)]
    public string? Address { get; init; }
}