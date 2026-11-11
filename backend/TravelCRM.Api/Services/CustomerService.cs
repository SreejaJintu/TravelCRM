using TravelCRM.Api.DTOs.Customers;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Services;

public sealed class CustomerService : ICustomerService
{
    private readonly ICustomerRepository _customerRepository;

    public CustomerService(ICustomerRepository customerRepository)
    {
        _customerRepository = customerRepository;
    }

    public async Task<PagedResponseDto<CustomerResponseDto>> GetCustomersAsync(
        int userId,
        bool isAdmin,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        int? ownerUserId = isAdmin ? null : userId;
        var (items, totalCount) = await _customerRepository.GetPagedAsync(
            ownerUserId,
            search,
            page,
            pageSize,
            cancellationToken);

        var responseItems = items.Select(ToResponse).ToArray();
        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResponseDto<CustomerResponseDto>(
            responseItems,
            page,
            pageSize,
            totalCount,
            totalPages);
    }

    public async Task<CustomerResponseDto?> GetByIdAsync(
        int customerId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var customer = await _customerRepository.GetByIdAsync(
            customerId,
            isAdmin ? null : userId,
            cancellationToken);

        return customer is null ? null : ToResponse(customer);
    }

    public async Task<CustomerOperationResult<CustomerResponseDto>> CreateAsync(
        int createdByUserId,
        CreateCustomerRequestDto request,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        if (await _customerRepository.EmailExistsAsync(email, null, cancellationToken))
        {
            return new CustomerOperationResult<CustomerResponseDto>(
                CustomerOperationStatus.EmailConflict);
        }

        var customer = new Customer
        {
            FullName = request.FullName.Trim(),
            Email = email,
            Phone = request.Phone.Trim(),
            DateOfBirth = request.DateOfBirth,
            Gender = NormalizeOptional(request.Gender),
            Address = NormalizeOptional(request.Address),
            CreatedByUserId = createdByUserId,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        await _customerRepository.AddAsync(customer, cancellationToken);
        await _customerRepository.SaveChangesAsync(cancellationToken);

        var createdCustomer = await _customerRepository.GetByIdAsync(
            customer.CustomerId,
            null,
            cancellationToken);

        return new CustomerOperationResult<CustomerResponseDto>(
            CustomerOperationStatus.Success,
            ToResponse(createdCustomer!));
    }

    public async Task<CustomerOperationResult<CustomerResponseDto>> UpdateAsync(
        int customerId,
        int userId,
        bool isAdmin,
        UpdateCustomerRequestDto request,
        CancellationToken cancellationToken)
    {
        var customer = await _customerRepository.GetByIdAsync(
            customerId,
            isAdmin ? null : userId,
            cancellationToken);

        if (customer is null)
        {
            return new CustomerOperationResult<CustomerResponseDto>(
                CustomerOperationStatus.NotFound);
        }

        var email = NormalizeEmail(request.Email);
        if (await _customerRepository.EmailExistsAsync(email, customerId, cancellationToken))
        {
            return new CustomerOperationResult<CustomerResponseDto>(
                CustomerOperationStatus.EmailConflict);
        }

        customer.FullName = request.FullName.Trim();
        customer.Email = email;
        customer.Phone = request.Phone.Trim();
        customer.DateOfBirth = request.DateOfBirth;
        customer.Gender = NormalizeOptional(request.Gender);
        customer.Address = NormalizeOptional(request.Address);
        customer.UpdatedAt = DateTime.UtcNow;

        await _customerRepository.SaveChangesAsync(cancellationToken);

        return new CustomerOperationResult<CustomerResponseDto>(
            CustomerOperationStatus.Success,
            ToResponse(customer));
    }

    public async Task<CustomerOperationResult<CustomerResponseDto>> SetActiveAsync(
        int customerId,
        int userId,
        bool isAdmin,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var customer = await _customerRepository.GetByIdAsync(
            customerId,
            isAdmin ? null : userId,
            cancellationToken);

        if (customer is null)
        {
            return new CustomerOperationResult<CustomerResponseDto>(
                CustomerOperationStatus.NotFound);
        }

        if (customer.IsActive != isActive)
        {
            customer.IsActive = isActive;
            customer.UpdatedAt = DateTime.UtcNow;
            await _customerRepository.SaveChangesAsync(cancellationToken);
        }

        return new CustomerOperationResult<CustomerResponseDto>(
            CustomerOperationStatus.Success,
            ToResponse(customer));
    }

    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static CustomerResponseDto ToResponse(Customer customer)
    {
        return new CustomerResponseDto(
            customer.CustomerId,
            customer.FullName,
            customer.Email,
            customer.Phone,
            customer.DateOfBirth,
            customer.Gender,
            customer.Address,
            customer.CreatedByUserId,
            customer.CreatedByUser.FullName,
            DateTime.SpecifyKind(customer.CreatedAt, DateTimeKind.Utc),
            customer.UpdatedAt is { } updatedAt
                ? DateTime.SpecifyKind(updatedAt, DateTimeKind.Utc)
                : null,
            customer.IsActive);
    }
}