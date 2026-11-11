using TravelCRM.Api.DTOs.FollowUps;
using TravelCRM.Api.Models;

namespace TravelCRM.Api.Services.Interfaces;

public interface IFollowUpService
{
    Task<PagedFollowUpsResponseDto<FollowUpResponseDto>> GetFollowUpsAsync(
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
        CancellationToken cancellationToken);

    Task<FollowUpResponseDto?> GetByIdAsync(
        int followUpId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<FollowUpAssignableStaffResponseDto>> GetAssignableStaffAsync(
        CancellationToken cancellationToken);

    Task<FollowUpOperationResult<FollowUpResponseDto>> CreateAsync(
        int createdByUserId,
        bool isAdmin,
        CreateFollowUpRequestDto request,
        CancellationToken cancellationToken);

    Task<FollowUpOperationResult<FollowUpResponseDto>> UpdateAsync(
        int followUpId,
        int userId,
        bool isAdmin,
        UpdateFollowUpRequestDto request,
        CancellationToken cancellationToken);

    Task<FollowUpOperationResult<FollowUpResponseDto>> AssignAsync(
        int followUpId,
        int assignedToUserId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<FollowUpOperationResult<FollowUpResponseDto>> CompleteAsync(
        int followUpId,
        int userId,
        bool isAdmin,
        string outcome,
        CancellationToken cancellationToken);

    Task<FollowUpOperationResult<FollowUpResponseDto>> CancelAsync(
        int followUpId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);
}