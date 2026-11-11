using TravelCRM.Api.DTOs.Payments;
using TravelCRM.Api.Models;

namespace TravelCRM.Api.Services.Interfaces;

public interface IPaymentService
{
    Task<PagedPaymentsResponseDto<PaymentResponseDto>> GetPagedAsync(
        int userId,
        bool isAdmin,
        string? search,
        int? bookingId,
        string? status,
        string? method,
        DateOnly? from,
        DateOnly? to,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<PaymentDetailsDto?> GetByIdAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<BookingPaymentHistoryDto?> GetBookingHistoryAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<PaymentDashboardSummaryDto> GetDashboardSummaryAsync(
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);

    Task<PaymentOperationResult<PaymentDetailsDto>> CreateAsync(
        int userId,
        bool isAdmin,
        CreatePaymentRequestDto request,
        CancellationToken cancellationToken);

    Task<PaymentOperationResult<PaymentDetailsDto>> UpdateAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        UpdatePaymentRequestDto request,
        CancellationToken cancellationToken);

    Task<PaymentOperationResult<PaymentDetailsDto>> ChangeStatusAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        string status,
        CancellationToken cancellationToken);

    Task<PaymentOperationStatus> DeleteAsync(
        int paymentId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken);
}
