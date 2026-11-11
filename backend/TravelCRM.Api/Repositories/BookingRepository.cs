using System.Data;
using Microsoft.EntityFrameworkCore;
using TravelCRM.Api.Data;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;

namespace TravelCRM.Api.Repositories;

public sealed class BookingRepository : IBookingRepository
{
    private readonly ApplicationDbContext _context;

    public BookingRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<(IReadOnlyList<Booking> Items, int TotalCount)> GetPagedAsync(
        int userId,
        bool isAdmin,
        string? search,
        string? status,
        DateOnly? travelStartFrom,
        DateOnly? travelStartTo,
        int page,
        int pageSize,
        int? customerId,
        int? travelPackageId,
        CancellationToken cancellationToken)
    {
        IQueryable<Booking> query = ApplyAccessFilter(
            _context.Bookings.AsNoTracking(), userId, isAdmin);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchTerm = search.Trim();
            query = query.Where(booking =>
                booking.BookingNumber.Contains(searchTerm) ||
                booking.Customer.FullName.Contains(searchTerm));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(booking => booking.BookingStatus == status);
        }

        if (travelStartFrom.HasValue)
        {
            query = query.Where(booking => booking.TravelStartDate >= travelStartFrom.Value);
        }

        if (travelStartTo.HasValue)
        {
            query = query.Where(booking => booking.TravelStartDate <= travelStartTo.Value);
        }

        if (customerId.HasValue)
        {
            query = query.Where(booking => booking.CustomerId == customerId.Value);
        }

        if (travelPackageId.HasValue)
        {
            query = query.Where(booking => booking.TravelPackageId == travelPackageId.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Include(booking => booking.Customer)
            .Include(booking => booking.TravelPackage)
            .Include(booking => booking.AssignedToUser)
            .OrderByDescending(booking => booking.CreatedAt)
            .ThenByDescending(booking => booking.BookingId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<Booking?> GetByIdAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        bool tracked,
        CancellationToken cancellationToken)
    {
        IQueryable<Booking> query = _context.Bookings;
        if (!tracked)
        {
            query = query.AsNoTracking();
        }

        query = ApplyAccessFilter(query, userId, isAdmin)
            .Include(booking => booking.Customer)
            .Include(booking => booking.Lead)
            .Include(booking => booking.TravelPackage)
            .Include(booking => booking.AssignedToUser)
            .Include(booking => booking.CreatedByUser)
            .Include(booking => booking.Travelers);

        return query.FirstOrDefaultAsync(booking => booking.BookingId == bookingId, cancellationToken);
    }

    public Task<Customer?> GetActiveCustomerAsync(
        int customerId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var query = _context.Customers.AsNoTracking()
            .Where(customer => customer.CustomerId == customerId && customer.IsActive);
        if (!isAdmin)
        {
            query = query.Where(customer => customer.CreatedByUserId == userId);
        }

        return query.FirstOrDefaultAsync(cancellationToken);
    }

    public Task<TravelPackage?> GetActivePackageAsync(
        int travelPackageId,
        CancellationToken cancellationToken)
    {
        return _context.TravelPackages.FirstOrDefaultAsync(
                package => package.TravelPackageId == travelPackageId && package.IsActive,
                cancellationToken);
    }

    public Task<Lead?> GetAccessibleLeadAsync(
        int leadId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        IQueryable<Lead> query = _context.Leads.AsNoTracking()
            .Include(lead => lead.ConvertedCustomer);
        if (!isAdmin)
        {
            query = query.Where(lead =>
                lead.CreatedByUserId == userId || lead.AssignedToUserId == userId);
        }

        return query.FirstOrDefaultAsync(lead => lead.LeadId == leadId, cancellationToken);
    }

    public async Task<IReadOnlyList<User>> GetAssignableStaffAsync(CancellationToken cancellationToken)
    {
        return await _context.Users.AsNoTracking()
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

    public async Task AddAsync(Booking booking, CancellationToken cancellationToken)
    {
        await _context.Bookings.AddAsync(booking, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        _context.SaveChangesAsync(cancellationToken);

    public async Task<BookingOperationResult<Booking>> CreateFromLeadAsync(
        int leadId,
        int userId,
        bool isAdmin,
        int actingUserId,
        int? assignedToUserId,
        Booking booking,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        IQueryable<Lead> leadQuery = _context.Leads.Include(lead => lead.ConvertedCustomer);
        if (!isAdmin)
        {
            leadQuery = leadQuery.Where(lead =>
                lead.CreatedByUserId == userId || lead.AssignedToUserId == userId);
        }

        var lead = await leadQuery.FirstOrDefaultAsync(
            item => item.LeadId == leadId,
            cancellationToken);
        if (lead is null)
        {
            return new BookingOperationResult<Booking>(BookingOperationStatus.NotFound);
        }

        if (!lead.IsActive || lead.LeadStatus == LeadStatuses.Lost)
        {
            return new BookingOperationResult<Booking>(BookingOperationStatus.InvalidLead);
        }

        var package = await _context.TravelPackages.FirstOrDefaultAsync(
            item => item.TravelPackageId == booking.TravelPackageId && item.IsActive,
            cancellationToken);
        if (package is null)
        {
            return new BookingOperationResult<Booking>(BookingOperationStatus.InvalidPackage);
        }

        if (assignedToUserId.HasValue &&
            !await IsAssignableStaffAsync(assignedToUserId.Value, cancellationToken))
        {
            return new BookingOperationResult<Booking>(BookingOperationStatus.InvalidAssignee);
        }

        Customer? customer = lead.ConvertedCustomer;
        if (lead.ConvertedCustomerId.HasValue && customer is null)
        {
            customer = await _context.Customers.FirstOrDefaultAsync(
                item => item.CustomerId == lead.ConvertedCustomerId.Value,
                cancellationToken);
        }

        if (customer is null)
        {
            var email = string.IsNullOrWhiteSpace(lead.Email)
                ? null
                : lead.Email.Trim().ToLowerInvariant();
            var phone = lead.Phone.Trim();
            var matches = await _context.Customers
                .Where(item => item.Phone == phone ||
                    (email != null && item.Email == email))
                .ToListAsync(cancellationToken);

            if (matches.Count > 1)
            {
                return new BookingOperationResult<Booking>(BookingOperationStatus.AmbiguousCustomer);
            }

            if (matches.Count == 0)
            {
                if (email is null)
                {
                    return new BookingOperationResult<Booking>(BookingOperationStatus.EmailRequired);
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
            else
            {
                customer = matches[0];
            }
        }

        if (!customer.IsActive)
        {
            return new BookingOperationResult<Booking>(BookingOperationStatus.InvalidCustomer);
        }

        booking.Customer = customer;
        booking.CustomerId = customer.CustomerId;
        booking.Lead = lead;
        booking.LeadId = lead.LeadId;
        booking.TravelPackage = package;
        booking.AssignedToUserId = assignedToUserId ?? (isAdmin ? lead.AssignedToUserId : userId);
        if (booking.AssignedToUserId.HasValue &&
            !await IsAssignableStaffAsync(booking.AssignedToUserId.Value, cancellationToken))
        {
            booking.AssignedToUserId = isAdmin ? null : userId;
        }

        if (!BookingPricing.TryApply(booking, package))
        {
            return new BookingOperationResult<Booking>(BookingOperationStatus.InvalidState);
        }

        var now = DateTime.UtcNow;
        if (!lead.ConvertedCustomerId.HasValue)
        {
            lead.ConvertedCustomer = customer;
            lead.ConvertedAt = now;
        }

        lead.LeadStatus = LeadStatuses.Converted;
        lead.UpdatedAt = now;
        booking.BookingNumber = CreateBookingNumber(now);
        booking.BookingStatus = BookingStatuses.Pending;
        booking.CreatedByUserId = actingUserId;
        booking.CreatedAt = now;
        booking.IsActive = true;

        await _context.Bookings.AddAsync(booking, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new BookingOperationResult<Booking>(BookingOperationStatus.Success, booking);
    }

    private static IQueryable<Booking> ApplyAccessFilter(
        IQueryable<Booking> query,
        int userId,
        bool isAdmin)
    {
        return isAdmin
            ? query
            : query.Where(booking =>
                booking.CreatedByUserId == userId ||
                booking.AssignedToUserId == userId ||
                booking.Customer.CreatedByUserId == userId ||
                (booking.Lead != null &&
                    (booking.Lead.CreatedByUserId == userId || booking.Lead.AssignedToUserId == userId)));
    }

    private static string CreateBookingNumber(DateTime createdAt) =>
        $"BK-{createdAt:yyyyMMdd}-{Guid.NewGuid():N}"[..20].ToUpperInvariant();
}
