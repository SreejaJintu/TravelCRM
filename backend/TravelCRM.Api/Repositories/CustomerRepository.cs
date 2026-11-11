using Microsoft.EntityFrameworkCore;
using TravelCRM.Api.Data;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;

namespace TravelCRM.Api.Repositories;

public sealed class CustomerRepository : ICustomerRepository
{
    private readonly ApplicationDbContext _context;

    public CustomerRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<(IReadOnlyList<Customer> Items, int TotalCount)> GetPagedAsync(
        int? ownerUserId,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        IQueryable<Customer> query = _context.Customers
            .AsNoTracking()
            .Include(customer => customer.CreatedByUser);

        if (ownerUserId.HasValue)
        {
            query = query.Where(customer => customer.CreatedByUserId == ownerUserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchTerm = search.Trim();
            query = query.Where(customer =>
                customer.FullName.Contains(searchTerm) ||
                customer.Email.Contains(searchTerm) ||
                customer.Phone.Contains(searchTerm));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(customer => customer.CreatedAt)
            .ThenBy(customer => customer.CustomerId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<Customer?> GetByIdAsync(
        int customerId,
        int? ownerUserId,
        CancellationToken cancellationToken)
    {
        IQueryable<Customer> query = _context.Customers
            .Include(customer => customer.CreatedByUser);

        if (ownerUserId.HasValue)
        {
            query = query.Where(customer => customer.CreatedByUserId == ownerUserId.Value);
        }

        return query.FirstOrDefaultAsync(
            customer => customer.CustomerId == customerId,
            cancellationToken);
    }

    public Task<bool> EmailExistsAsync(
        string email,
        int? excludingCustomerId,
        CancellationToken cancellationToken)
    {
        var query = _context.Customers.Where(customer => customer.Email == email);

        if (excludingCustomerId.HasValue)
        {
            query = query.Where(customer => customer.CustomerId != excludingCustomerId.Value);
        }

        return query.AnyAsync(cancellationToken);
    }

    public async Task AddAsync(Customer customer, CancellationToken cancellationToken)
    {
        await _context.Customers.AddAsync(customer, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }
}