using TravelCRM.Api.DTOs.FollowUps;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Services;

public sealed class FollowUpService : IFollowUpService
{
    private readonly IFollowUpRepository _followUpRepository;
    private readonly ILeadRepository _leadRepository;

    public FollowUpService(
        IFollowUpRepository followUpRepository,
        ILeadRepository leadRepository)
    {
        _followUpRepository = followUpRepository;
        _leadRepository = leadRepository;
    }

    public async Task<PagedFollowUpsResponseDto<FollowUpResponseDto>> GetFollowUpsAsync(
        int userId,
        bool isAdmin,
        string? search,
        int? leadId,
        int? assignedToUserId,
        string? status,
        DateTimeOffset? from,
        DateTimeOffset? to,
        FollowUpWindow window,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(status) && !FollowUpStatuses.IsValid(status))
        {
            throw new ArgumentException("The requested follow-up status is invalid.", nameof(status));
        }

        if (from.HasValue && to.HasValue && from.Value > to.Value)
        {
            throw new ArgumentException("The from date must be on or before the to date.");
        }

        if (!isAdmin && assignedToUserId.HasValue && assignedToUserId.Value != userId)
        {
            throw new UnauthorizedAccessException("Staff can filter only their own assignments.");
        }

        var (items, totalCount) = await _followUpRepository.GetPagedAsync(
            userId,
            isAdmin,
            search,
            leadId,
            assignedToUserId,
            status,
            from?.ToUniversalTime(),
            to?.ToUniversalTime(),
            window,
            DateTimeOffset.UtcNow,
            page,
            pageSize,
            cancellationToken);

        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedFollowUpsResponseDto<FollowUpResponseDto>(
            items.Select(ToResponse).ToArray(),
            page,
            pageSize,
            totalCount,
            totalPages);
    }

    public async Task<FollowUpResponseDto?> GetByIdAsync(
        int followUpId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var followUp = await _followUpRepository.GetByIdAsync(
            followUpId,
            userId,
            isAdmin,
            cancellationToken);

        return followUp is null ? null : ToResponse(followUp);
    }

    public async Task<IReadOnlyList<FollowUpAssignableStaffResponseDto>> GetAssignableStaffAsync(
        CancellationToken cancellationToken)
    {
        var staff = await _leadRepository.GetAssignableStaffAsync(cancellationToken);
        return staff.Select(user => new FollowUpAssignableStaffResponseDto(
            user.UserId,
            user.FullName,
            user.Email)).ToArray();
    }

    public async Task<FollowUpOperationResult<FollowUpResponseDto>> CreateAsync(
        int createdByUserId,
        bool isAdmin,
        CreateFollowUpRequestDto request,
        CancellationToken cancellationToken)
    {
        var lead = await _leadRepository.GetByIdAsync(
            request.LeadId,
            createdByUserId,
            isAdmin,
            cancellationToken);

        if (lead is null)
        {
            return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.InvalidLead);
        }

        var assignedToUserId = createdByUserId;
        if (isAdmin)
        {
            if (!request.AssignedToUserId.HasValue ||
                !await _followUpRepository.IsActiveStaffAsync(request.AssignedToUserId.Value, cancellationToken))
            {
                return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.InvalidAssignee);
            }
            assignedToUserId = request.AssignedToUserId.Value;
        }
        else if (request.AssignedToUserId.HasValue && request.AssignedToUserId.Value != createdByUserId)
        {
            return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.Forbidden);
        }

        var followUp = new FollowUp
        {
            LeadId = request.LeadId,
            AssignedToUserId = assignedToUserId,
            FollowUpType = request.FollowUpType,
            Subject = request.Subject.Trim(),
            Description = NormalizeOptional(request.Description),
            ScheduledAt = request.ScheduledAt.ToUniversalTime(),
            Status = FollowUpStatuses.Pending,
            CreatedByUserId = createdByUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            IsActive = true
        };

        await _followUpRepository.AddAsync(followUp, cancellationToken);
        await _followUpRepository.SaveChangesAsync(cancellationToken);

        var created = await _followUpRepository.GetByIdAsync(
            followUp.FollowUpId,
            createdByUserId,
            isAdmin,
            cancellationToken);

        return new FollowUpOperationResult<FollowUpResponseDto>(
            FollowUpOperationStatus.Success,
            ToResponse(created!));
    }

    public async Task<FollowUpOperationResult<FollowUpResponseDto>> UpdateAsync(
        int followUpId,
        int userId,
        bool isAdmin,
        UpdateFollowUpRequestDto request,
        CancellationToken cancellationToken)
    {
        var followUp = await _followUpRepository.GetByIdAsync(followUpId, userId, isAdmin, cancellationToken);
        if (followUp is null)
        {
            return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.NotFound);
        }

        if (!followUp.IsActive || followUp.Status != FollowUpStatuses.Pending)
        {
            return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.Conflict);
        }

        var lead = await _leadRepository.GetByIdAsync(request.LeadId, userId, isAdmin, cancellationToken);
        if (lead is null)
        {
            return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.InvalidLead);
        }

        followUp.LeadId = request.LeadId;
        followUp.FollowUpType = request.FollowUpType;
        followUp.Subject = request.Subject.Trim();
        followUp.Description = NormalizeOptional(request.Description);
        followUp.ScheduledAt = request.ScheduledAt.ToUniversalTime();
        followUp.UpdatedAt = DateTimeOffset.UtcNow;

        await _followUpRepository.SaveChangesAsync(cancellationToken);
        var updated = await _followUpRepository.GetByIdAsync(followUpId, userId, isAdmin, cancellationToken);
        return new FollowUpOperationResult<FollowUpResponseDto>(
            FollowUpOperationStatus.Success,
            ToResponse(updated!));
    }

    public async Task<FollowUpOperationResult<FollowUpResponseDto>> AssignAsync(
        int followUpId,
        int assignedToUserId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        if (!isAdmin)
        {
            return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.Forbidden);
        }

        if (!await _followUpRepository.IsActiveStaffAsync(assignedToUserId, cancellationToken))
        {
            return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.InvalidAssignee);
        }

        var followUp = await _followUpRepository.GetByIdAsync(followUpId, userId, isAdmin, cancellationToken);
        if (followUp is null)
        {
            return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.NotFound);
        }

        if (!followUp.IsActive || followUp.Status != FollowUpStatuses.Pending)
        {
            return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.Conflict);
        }

        followUp.AssignedToUserId = assignedToUserId;
        followUp.UpdatedAt = DateTimeOffset.UtcNow;
        await _followUpRepository.SaveChangesAsync(cancellationToken);

        var updated = await _followUpRepository.GetByIdAsync(followUpId, userId, isAdmin, cancellationToken);
        return new FollowUpOperationResult<FollowUpResponseDto>(
            FollowUpOperationStatus.Success,
            ToResponse(updated!));
    }

    public async Task<FollowUpOperationResult<FollowUpResponseDto>> CompleteAsync(
        int followUpId,
        int userId,
        bool isAdmin,
        string outcome,
        CancellationToken cancellationToken)
    {
        var followUp = await _followUpRepository.GetByIdAsync(followUpId, userId, isAdmin, cancellationToken);
        if (followUp is null)
        {
            return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.NotFound);
        }

        if (!followUp.IsActive || followUp.Status != FollowUpStatuses.Pending)
        {
            return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.Conflict);
        }

        followUp.Status = FollowUpStatuses.Completed;
        followUp.Outcome = outcome.Trim();
        followUp.CompletedAt = DateTimeOffset.UtcNow;
        followUp.UpdatedAt = followUp.CompletedAt;
        await _followUpRepository.SaveChangesAsync(cancellationToken);

        return new FollowUpOperationResult<FollowUpResponseDto>(
            FollowUpOperationStatus.Success,
            ToResponse(followUp));
    }

    public async Task<FollowUpOperationResult<FollowUpResponseDto>> CancelAsync(
        int followUpId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var followUp = await _followUpRepository.GetByIdAsync(followUpId, userId, isAdmin, cancellationToken);
        if (followUp is null)
        {
            return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.NotFound);
        }

        if (!followUp.IsActive || followUp.Status != FollowUpStatuses.Pending)
        {
            return new FollowUpOperationResult<FollowUpResponseDto>(FollowUpOperationStatus.Conflict);
        }

        followUp.Status = FollowUpStatuses.Cancelled;
        followUp.UpdatedAt = DateTimeOffset.UtcNow;
        await _followUpRepository.SaveChangesAsync(cancellationToken);

        return new FollowUpOperationResult<FollowUpResponseDto>(
            FollowUpOperationStatus.Success,
            ToResponse(followUp));
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static FollowUpResponseDto ToResponse(FollowUp followUp)
    {
        return new FollowUpResponseDto(
            followUp.FollowUpId,
            followUp.LeadId,
            followUp.Lead.LeadNumber,
            followUp.Lead.FullName,
            followUp.Lead.Destination,
            followUp.AssignedToUserId,
            followUp.AssignedToUser.FullName,
            followUp.FollowUpType,
            followUp.Subject,
            followUp.Description,
            followUp.ScheduledAt,
            followUp.Status,
            followUp.Outcome,
            followUp.CompletedAt,
            followUp.CreatedByUserId,
            followUp.CreatedByUser.FullName,
            followUp.CreatedAt,
            followUp.UpdatedAt,
            followUp.IsActive);
    }
}