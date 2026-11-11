using TravelCRM.Api.DTOs.Bookings;
using TravelCRM.Api.Models;

namespace TravelCRM.Api.Services.Interfaces;

public interface IBookingService
{
    Task<PagedBookingsResponseDto<BookingSummaryDto>> GetPagedAsync(
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
        CancellationToken cancellationToken);

    Task<BookingDetailsDto?> GetByIdAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<BookingOperationResult<BookingDetailsDto>> CreateAsync(
        int userId,
        bool isAdmin,
        CreateBookingRequestDto request,
        CancellationToken cancellationToken);

    Task<BookingOperationResult<BookingDetailsDto>> UpdateAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        UpdateBookingRequestDto request,
        CancellationToken cancellationToken);

    Task<BookingOperationResult<BookingDetailsDto>> ChangeStatusAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        string status,
        CancellationToken cancellationToken);

    Task<BookingOperationResult<BookingDetailsDto>> AssignAsync(
        int bookingId,
        int? assignedToUserId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<AssignableBookingStaffResponseDto>> GetAssignableStaffAsync(CancellationToken cancellationToken);

    Task<BookingOperationResult<BookingDetailsDto>> CreateFromLeadAsync(
        int leadId,
        int userId,
        bool isAdmin,
        CreateBookingFromLeadRequestDto request,
        CancellationToken cancellationToken);
}
