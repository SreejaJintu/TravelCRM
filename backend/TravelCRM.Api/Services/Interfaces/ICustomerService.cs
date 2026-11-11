using TravelCRM.Api.DTOs.Customers;

namespace TravelCRM.Api.Services.Interfaces;

public interface ICustomerService
{
    Task<PagedResponseDto<CustomerResponseDto>> GetCustomersAsync(
        int userId,
        bool isAdmin,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<CustomerResponseDto?> GetByIdAsync(
        int customerId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<CustomerOperationResult<CustomerResponseDto>> CreateAsync(
        int createdByUserId,
        CreateCustomerRequestDto request,
        CancellationToken cancellationToken);

    Task<CustomerOperationResult<CustomerResponseDto>> UpdateAsync(
        int customerId,
        int userId,
        bool isAdmin,
        UpdateCustomerRequestDto request,
        CancellationToken cancellationToken);

    Task<CustomerOperationResult<CustomerResponseDto>> SetActiveAsync(
        int customerId,
        int userId,
        bool isAdmin,
        bool isActive,
        CancellationToken cancellationToken);
}