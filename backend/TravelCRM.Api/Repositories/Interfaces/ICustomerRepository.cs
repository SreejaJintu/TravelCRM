using TravelCRM.Api.Models;

namespace TravelCRM.Api.Repositories.Interfaces;

public interface ICustomerRepository
{
    Task<(IReadOnlyList<Customer> Items, int TotalCount)> GetPagedAsync(
        int? ownerUserId,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<Customer?> GetByIdAsync(
        int customerId,
        int? ownerUserId,
        CancellationToken cancellationToken);

    Task<bool> EmailExistsAsync(
        string email,
        int? excludingCustomerId,
        CancellationToken cancellationToken);

    Task AddAsync(Customer customer, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}