using System.Data;
using Microsoft.EntityFrameworkCore;
using TravelCRM.Api.Data;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;

namespace TravelCRM.Api.Repositories;

public sealed class LeadRepository : ILeadRepository
{
    private readonly ApplicationDbContext _context;

    public LeadRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<(IReadOnlyList<Lead> Items, int TotalCount)> GetPagedAsync(
        int userId,
        bool isAdmin,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        IQueryable<Lead> query = ApplyOwnershipFilter(
            _context.Leads.AsNoTracking(), userId, isAdmin);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchTerm = search.Trim();
            query = query.Where(lead =>
                lead.LeadNumber.Contains(searchTerm) ||
                lead.FullName.Contains(searchTerm) ||
                lead.Phone.Contains(searchTerm) ||
                (lead.Email != null && lead.Email.Contains(searchTerm)) ||
                lead.Destination.Contains(searchTerm) ||
                lead.LeadSource.Contains(searchTerm) ||
                lead.LeadStatus.Contains(searchTerm));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Include(lead => lead.CreatedByUser)
            .Include(lead => lead.AssignedToUser)
            .OrderByDescending(lead => lead.CreatedAt)
            .ThenByDescending(lead => lead.LeadId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<Lead?> GetByIdAsync(
        int leadId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var query = ApplyOwnershipFilter(
            _context.Leads
                .Include(lead => lead.CreatedByUser)
                .Include(lead => lead.AssignedToUser),
            userId,
            isAdmin);

        return query.FirstOrDefaultAsync(lead => lead.LeadId == leadId, cancellationToken);
    }

    public async Task<IReadOnlyList<User>> GetAssignableStaffAsync(CancellationToken cancellationToken)
    {
        return await _context.Users
            .AsNoTracking()
            .Include(user => user.Role)
            .Where(user => user.IsActive && user.Role.RoleName == "Staff")
            .OrderBy(user => user.FullName)
            .ToListAsync(cancellationToken);
    }

    public Task<bool> IsAssignableStaffAsync(int userId, CancellationToken cancellationToken)
    {
        return _context.Users.AnyAsync(
            user => user.UserId == userId && user.IsActive && user.Role.RoleName == "Staff",
            cancellationToken);
    }

    public async Task AddAsync(Lead lead, CancellationToken cancellationToken)
    {
        await _context.Leads.AddAsync(lead, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<LeadConversionData> ConvertToCustomerAsync(
        int leadId,
        int userId,
        int actingUserId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var lead = await ApplyOwnershipFilter(
                _context.Leads.Include(item => item.ConvertedCustomer), userId, isAdmin)
            .FirstOrDefaultAsync(item => item.LeadId == leadId, cancellationToken);

        if (lead is null)
        {
            return new LeadConversionData(LeadOperationStatus.NotFound);
        }

        if (lead.ConvertedCustomerId.HasValue)
        {
            await transaction.CommitAsync(cancellationToken);
            return new LeadConversionData(
                LeadOperationStatus.Success,
                lead.ConvertedCustomerId,
                false);
        }

        if (!lead.IsActive || lead.LeadStatus == LeadStatuses.Lost)
        {
            return new LeadConversionData(LeadOperationStatus.Conflict);
        }

        var email = string.IsNullOrWhiteSpace(lead.Email)
            ? null
            : lead.Email.Trim().ToLowerInvariant();
        var phone = lead.Phone.Trim();

        var matches = await _context.Customers
            .Where(customer => customer.Phone == phone ||
                (email != null && customer.Email == email))
            .ToListAsync(cancellationToken);

        if (matches.Count > 1)
        {
            return new LeadConversionData(LeadOperationStatus.AmbiguousCustomer);
        }

        Customer customer;
        var createdCustomer = matches.Count == 0;
        if (!createdCustomer)
        {
            customer = matches[0];
        }
        else
        {
            if (email is null)
            {
                return new LeadConversionData(LeadOperationStatus.EmailRequired);
            }

            customer = new Customer
            {
                FullName = lead.FullName.Trim(),
                Email = email,
                Phone = phone,
                CreatedByUserId = actingUserId,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };
            await _context.Customers.AddAsync(customer, cancellationToken);
        }

        lead.ConvertedCustomer = customer;
        lead.LeadStatus = LeadStatuses.Converted;
        lead.ConvertedAt = DateTime.UtcNow;
        lead.UpdatedAt = lead.ConvertedAt;

        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new LeadConversionData(
            LeadOperationStatus.Success,
            customer.CustomerId,
            createdCustomer);
    }

    private static IQueryable<Lead> ApplyOwnershipFilter(
        IQueryable<Lead> query,
        int userId,
        bool isAdmin)
    {
        return isAdmin
            ? query
            : query.Where(lead =>
                lead.CreatedByUserId == userId || lead.AssignedToUserId == userId);
    }
}