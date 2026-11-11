using Microsoft.EntityFrameworkCore;
using TravelCRM.Api.Data;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;

namespace TravelCRM.Api.Repositories;

public sealed class FollowUpRepository : IFollowUpRepository
{
    private readonly ApplicationDbContext _context;

    public FollowUpRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<(IReadOnlyList<FollowUp> Items, int TotalCount)> GetPagedAsync(
        int userId,
        bool isAdmin,
        string? search,
        int? leadId,
        int? assignedToUserId,
        string? status,
        DateTimeOffset? from,
        DateTimeOffset? to,
        FollowUpWindow window,
        DateTimeOffset now,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        IQueryable<FollowUp> query = ApplyAccessFilter(
            _context.FollowUps.AsNoTracking(), userId, isAdmin);

        query = query.Where(followUp => followUp.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchTerm = search.Trim();
            query = query.Where(followUp =>
                followUp.Subject.Contains(searchTerm) ||
                (followUp.Description != null && followUp.Description.Contains(searchTerm)) ||
                followUp.Lead.LeadNumber.Contains(searchTerm) ||
                followUp.Lead.FullName.Contains(searchTerm) ||
                followUp.Lead.Destination.Contains(searchTerm) ||
                followUp.AssignedToUser.FullName.Contains(searchTerm));
        }

        if (leadId.HasValue)
        {
            query = query.Where(followUp => followUp.LeadId == leadId.Value);
        }

        if (assignedToUserId.HasValue)
        {
            query = query.Where(followUp => followUp.AssignedToUserId == assignedToUserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(followUp => followUp.Status == status);
        }

        if (from.HasValue)
        {
            query = query.Where(followUp => followUp.ScheduledAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(followUp => followUp.ScheduledAt <= to.Value);
        }

        switch (window)
        {
            case FollowUpWindow.Today:
                var todayStart = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
                var tomorrowStart = todayStart.AddDays(1);
                query = query.Where(followUp =>
                    followUp.ScheduledAt >= todayStart &&
                    followUp.ScheduledAt < tomorrowStart);
                break;
            case FollowUpWindow.Overdue:
                query = query.Where(followUp =>
                    followUp.Status == FollowUpStatuses.Pending &&
                    followUp.ScheduledAt < now);
                break;
            case FollowUpWindow.Upcoming:
                query = query.Where(followUp =>
                    followUp.Status == FollowUpStatuses.Pending &&
                    followUp.ScheduledAt >= now);
                break;
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Include(followUp => followUp.Lead)
            .Include(followUp => followUp.AssignedToUser)
            .Include(followUp => followUp.CreatedByUser)
            .OrderBy(followUp => followUp.ScheduledAt)
            .ThenBy(followUp => followUp.FollowUpId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<FollowUp?> GetByIdAsync(
        int followUpId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var query = ApplyAccessFilter(
            _context.FollowUps
                .Include(followUp => followUp.Lead)
                .Include(followUp => followUp.AssignedToUser)
                .Include(followUp => followUp.CreatedByUser),
            userId,
            isAdmin);

        return query.FirstOrDefaultAsync(
            followUp => followUp.FollowUpId == followUpId,
            cancellationToken);
    }

    public Task<bool> IsActiveStaffAsync(int userId, CancellationToken cancellationToken)
    {
        return _context.Users.AnyAsync(
            user => user.UserId == userId && user.IsActive && user.Role.RoleName == "Staff",
            cancellationToken);
    }

    public async Task AddAsync(FollowUp followUp, CancellationToken cancellationToken)
    {
        await _context.FollowUps.AddAsync(followUp, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }

    private static IQueryable<FollowUp> ApplyAccessFilter(
        IQueryable<FollowUp> query,
        int userId,
        bool isAdmin)
    {
        return isAdmin
            ? query
            : query.Where(followUp =>
                followUp.AssignedToUserId == userId ||
                followUp.Lead.CreatedByUserId == userId ||
                followUp.Lead.AssignedToUserId == userId);
    }
}