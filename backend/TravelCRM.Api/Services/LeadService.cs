using TravelCRM.Api.DTOs.Leads;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Services;

public sealed class LeadService : ILeadService
{
    private readonly ILeadRepository _leadRepository;

    public LeadService(ILeadRepository leadRepository)
    {
        _leadRepository = leadRepository;
    }

    public async Task<PagedLeadsResponseDto<LeadResponseDto>> GetLeadsAsync(
        int userId,
        bool isAdmin,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var (items, totalCount) = await _leadRepository.GetPagedAsync(
            userId,
            isAdmin,
            search,
            page,
            pageSize,
            cancellationToken);

        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedLeadsResponseDto<LeadResponseDto>(
            items.Select(ToResponse).ToArray(),
            page,
            pageSize,
            totalCount,
            totalPages);
    }

    public async Task<LeadResponseDto?> GetByIdAsync(
        int leadId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var lead = await _leadRepository.GetByIdAsync(
            leadId,
            userId,
            isAdmin,
            cancellationToken);

        return lead is null ? null : ToResponse(lead);
    }

    public async Task<IReadOnlyList<AssignableStaffResponseDto>> GetAssignableStaffAsync(
        CancellationToken cancellationToken)
    {
        var staff = await _leadRepository.GetAssignableStaffAsync(cancellationToken);
        return staff.Select(user => new AssignableStaffResponseDto(
            user.UserId,
            user.FullName,
            user.Email)).ToArray();
    }

    public async Task<LeadResponseDto> CreateAsync(
        int createdByUserId,
        CreateLeadRequestDto request,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var lead = new Lead
        {
            LeadNumber = CreateLeadNumber(now),
            FullName = request.FullName.Trim(),
            Phone = request.Phone.Trim(),
            Email = NormalizeEmail(request.Email),
            Destination = request.Destination.Trim(),
            TravelStartDate = request.TravelStartDate,
            TravelEndDate = request.TravelEndDate,
            NumberOfAdults = request.NumberOfAdults,
            NumberOfChildren = request.NumberOfChildren,
            Budget = request.Budget,
            LeadSource = request.LeadSource.Trim(),
            LeadStatus = LeadStatuses.New,
            Notes = NormalizeOptional(request.Notes),
            CreatedByUserId = createdByUserId,
            CreatedAt = now,
            IsActive = true
        };

        await _leadRepository.AddAsync(lead, cancellationToken);
        await _leadRepository.SaveChangesAsync(cancellationToken);

        var createdLead = await _leadRepository.GetByIdAsync(
            lead.LeadId,
            createdByUserId,
            false,
            cancellationToken);

        return ToResponse(createdLead!);
    }

    public async Task<LeadOperationResult<LeadResponseDto>> UpdateAsync(
        int leadId,
        int userId,
        bool isAdmin,
        UpdateLeadRequestDto request,
        CancellationToken cancellationToken)
    {
        var lead = await _leadRepository.GetByIdAsync(leadId, userId, isAdmin, cancellationToken);
        if (lead is null)
        {
            return new LeadOperationResult<LeadResponseDto>(LeadOperationStatus.NotFound);
        }

        if (lead.ConvertedCustomerId.HasValue)
        {
            return new LeadOperationResult<LeadResponseDto>(LeadOperationStatus.Conflict);
        }

        lead.FullName = request.FullName.Trim();
        lead.Phone = request.Phone.Trim();
        lead.Email = NormalizeEmail(request.Email);
        lead.Destination = request.Destination.Trim();
        lead.TravelStartDate = request.TravelStartDate;
        lead.TravelEndDate = request.TravelEndDate;
        lead.NumberOfAdults = request.NumberOfAdults;
        lead.NumberOfChildren = request.NumberOfChildren;
        lead.Budget = request.Budget;
        lead.LeadSource = request.LeadSource.Trim();
        lead.Notes = NormalizeOptional(request.Notes);
        lead.UpdatedAt = DateTime.UtcNow;

        await _leadRepository.SaveChangesAsync(cancellationToken);
        return new LeadOperationResult<LeadResponseDto>(
            LeadOperationStatus.Success,
            ToResponse(lead));
    }

    public async Task<LeadOperationResult<LeadResponseDto>> ChangeStatusAsync(
        int leadId,
        int userId,
        bool isAdmin,
        string status,
        CancellationToken cancellationToken)
    {
        if (!LeadStatuses.CanBeSetDirectly(status))
        {
            return new LeadOperationResult<LeadResponseDto>(LeadOperationStatus.Conflict);
        }

        var lead = await _leadRepository.GetByIdAsync(leadId, userId, isAdmin, cancellationToken);
        if (lead is null)
        {
            return new LeadOperationResult<LeadResponseDto>(LeadOperationStatus.NotFound);
        }

        if (lead.ConvertedCustomerId.HasValue)
        {
            return new LeadOperationResult<LeadResponseDto>(LeadOperationStatus.Conflict);
        }

        lead.LeadStatus = status;
        lead.UpdatedAt = DateTime.UtcNow;
        await _leadRepository.SaveChangesAsync(cancellationToken);

        return new LeadOperationResult<LeadResponseDto>(
            LeadOperationStatus.Success,
            ToResponse(lead));
    }

    public async Task<LeadOperationResult<LeadResponseDto>> AssignAsync(
        int leadId,
        int? assignedToUserId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        if (!isAdmin)
        {
            return new LeadOperationResult<LeadResponseDto>(LeadOperationStatus.InvalidAssignee);
        }

        if (assignedToUserId.HasValue &&
            !await _leadRepository.IsAssignableStaffAsync(assignedToUserId.Value, cancellationToken))
        {
            return new LeadOperationResult<LeadResponseDto>(LeadOperationStatus.InvalidAssignee);
        }

        var lead = await _leadRepository.GetByIdAsync(leadId, userId, isAdmin, cancellationToken);
        if (lead is null)
        {
            return new LeadOperationResult<LeadResponseDto>(LeadOperationStatus.NotFound);
        }

        if (lead.ConvertedCustomerId.HasValue)
        {
            return new LeadOperationResult<LeadResponseDto>(LeadOperationStatus.Conflict);
        }

        lead.AssignedToUserId = assignedToUserId;
        lead.UpdatedAt = DateTime.UtcNow;
        await _leadRepository.SaveChangesAsync(cancellationToken);

        var updatedLead = await _leadRepository.GetByIdAsync(leadId, userId, isAdmin, cancellationToken);
        return new LeadOperationResult<LeadResponseDto>(
            LeadOperationStatus.Success,
            ToResponse(updatedLead!));
    }

    public async Task<LeadOperationResult<LeadResponseDto>> SetActiveAsync(
        int leadId,
        int userId,
        bool isAdmin,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var lead = await _leadRepository.GetByIdAsync(leadId, userId, isAdmin, cancellationToken);
        if (lead is null)
        {
            return new LeadOperationResult<LeadResponseDto>(LeadOperationStatus.NotFound);
        }

        if (lead.IsActive != isActive)
        {
            lead.IsActive = isActive;
            lead.UpdatedAt = DateTime.UtcNow;
            await _leadRepository.SaveChangesAsync(cancellationToken);
        }

        return new LeadOperationResult<LeadResponseDto>(
            LeadOperationStatus.Success,
            ToResponse(lead));
    }

    public async Task<LeadOperationResult<LeadConversionResponseDto>> ConvertAsync(
        int leadId,
        int userId,
        int actingUserId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var conversion = await _leadRepository.ConvertToCustomerAsync(
            leadId,
            userId,
            actingUserId,
            isAdmin,
            cancellationToken);

        if (conversion.Status != LeadOperationStatus.Success)
        {
            return new LeadOperationResult<LeadConversionResponseDto>(conversion.Status);
        }

        var lead = await _leadRepository.GetByIdAsync(leadId, userId, isAdmin, cancellationToken);
        var message = conversion.CreatedCustomer
            ? "Lead converted and a customer was created."
            : "Lead converted and associated with the existing customer.";

        return new LeadOperationResult<LeadConversionResponseDto>(
            LeadOperationStatus.Success,
            new LeadConversionResponseDto(
                leadId,
                lead!.LeadNumber,
                lead.LeadStatus,
                conversion.CustomerId!.Value,
                conversion.CreatedCustomer,
                message));
    }

    private static string CreateLeadNumber(DateTime createdAt)
    {
        return $"LD-{createdAt:yyyyMMdd}-{Guid.NewGuid():N}"[..23].ToUpperInvariant();
    }

    private static string? NormalizeEmail(string? email)
    {
        return string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static LeadResponseDto ToResponse(Lead lead)
    {
        return new LeadResponseDto(
            lead.LeadId,
            lead.LeadNumber,
            lead.FullName,
            lead.Phone,
            lead.Email,
            lead.Destination,
            lead.TravelStartDate,
            lead.TravelEndDate,
            lead.NumberOfAdults,
            lead.NumberOfChildren,
            lead.Budget,
            lead.LeadSource,
            lead.LeadStatus,
            lead.Notes,
            lead.AssignedToUserId,
            lead.AssignedToUser?.FullName,
            lead.CreatedByUserId,
            lead.CreatedByUser.FullName,
            ToUtc(lead.CreatedAt),
            lead.UpdatedAt is { } updatedAt ? ToUtc(updatedAt) : null,
            lead.IsActive,
            lead.ConvertedCustomerId,
            lead.ConvertedAt is { } convertedAt ? ToUtc(convertedAt) : null);
    }

    private static DateTimeOffset ToUtc(DateTime value)
    {
        return new DateTimeOffset(DateTime.SpecifyKind(value, DateTimeKind.Utc));
    }
}