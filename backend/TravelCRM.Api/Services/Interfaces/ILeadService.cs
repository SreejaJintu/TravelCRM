using TravelCRM.Api.DTOs.Leads;
using TravelCRM.Api.Models;

namespace TravelCRM.Api.Services.Interfaces;

public interface ILeadService
{
    Task<PagedLeadsResponseDto<LeadResponseDto>> GetLeadsAsync(
        int userId,
        bool isAdmin,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<LeadResponseDto?> GetByIdAsync(
        int leadId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<AssignableStaffResponseDto>> GetAssignableStaffAsync(
        CancellationToken cancellationToken);

    Task<LeadResponseDto> CreateAsync(
        int createdByUserId,
        CreateLeadRequestDto request,
        CancellationToken cancellationToken);

    Task<LeadOperationResult<LeadResponseDto>> UpdateAsync(
        int leadId,
        int userId,
        bool isAdmin,
        UpdateLeadRequestDto request,
        CancellationToken cancellationToken);

    Task<LeadOperationResult<LeadResponseDto>> ChangeStatusAsync(
        int leadId,
        int userId,
        bool isAdmin,
        string status,
        CancellationToken cancellationToken);

    Task<LeadOperationResult<LeadResponseDto>> AssignAsync(
        int leadId,
        int? assignedToUserId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<LeadOperationResult<LeadResponseDto>> SetActiveAsync(
        int leadId,
        int userId,
        bool isAdmin,
        bool isActive,
        CancellationToken cancellationToken);

    Task<LeadOperationResult<LeadConversionResponseDto>> ConvertAsync(
        int leadId,
        int userId,
        int actingUserId,
        bool isAdmin,
        CancellationToken cancellationToken);
}