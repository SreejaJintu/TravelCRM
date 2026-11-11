using TravelCRM.Api.DTOs.Bookings;
using TravelCRM.Api.DTOs.Payments;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Services;

public sealed class BookingService : IBookingService
{
    private readonly IBookingRepository _bookingRepository;
    private readonly IPaymentRepository _paymentRepository;

    public BookingService(
        IBookingRepository bookingRepository,
        IPaymentRepository paymentRepository)
    {
        _bookingRepository = bookingRepository;
        _paymentRepository = paymentRepository;
    }

    public async Task<PagedBookingsResponseDto<BookingSummaryDto>> GetPagedAsync(
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
        if (!string.IsNullOrWhiteSpace(status) && !BookingStatuses.IsValid(status))
        {
            throw new ArgumentException("The booking status is invalid.", nameof(status));
        }

        if (travelStartFrom.HasValue && travelStartTo.HasValue &&
            travelStartFrom.Value > travelStartTo.Value)
        {
            throw new ArgumentException("The travel date range is invalid.", nameof(travelStartTo));
        }

        var (items, totalCount) = await _bookingRepository.GetPagedAsync(
            userId,
            isAdmin,
            search,
            status,
            travelStartFrom,
            travelStartTo,
            page,
            pageSize,
            customerId,
            travelPackageId,
            cancellationToken);

        var totalsByBookingId = await _paymentRepository.GetTotalsByBookingIdsAsync(
            items.Select(booking => booking.BookingId).ToArray(),
            userId,
            isAdmin,
            cancellationToken);

        return new PagedBookingsResponseDto<BookingSummaryDto>(
            items.Select(booking => ToSummary(
                booking,
                totalsByBookingId.GetValueOrDefault(booking.BookingId) ??
                    new BookingPaymentTotals(0m, 0m, 0m))).ToArray(),
            page,
            pageSize,
            totalCount,
            totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize));
    }

    public async Task<BookingDetailsDto?> GetByIdAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetByIdAsync(
            bookingId, userId, isAdmin, false, cancellationToken);
        return booking is null
            ? null
            : await ToDetailsAsync(booking, userId, isAdmin, cancellationToken);
    }

    public async Task<BookingOperationResult<BookingDetailsDto>> CreateAsync(
        int userId,
        bool isAdmin,
        CreateBookingRequestDto request,
        CancellationToken cancellationToken)
    {
        var requestStatus = ValidateDetails(request);
        if (requestStatus != BookingOperationStatus.Success)
        {
            return new BookingOperationResult<BookingDetailsDto>(requestStatus);
        }

        var customer = await _bookingRepository.GetActiveCustomerAsync(
            request.CustomerId, userId, isAdmin, cancellationToken);
        if (customer is null)
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.InvalidCustomer);
        }

        Lead? associatedLead = null;
        if (request.LeadId.HasValue)
        {
            associatedLead = await _bookingRepository.GetAccessibleLeadAsync(
                request.LeadId.Value, userId, isAdmin, cancellationToken);
            if (associatedLead is null)
            {
                return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.NotFound);
            }

            if (!associatedLead.IsActive ||
                associatedLead.LeadStatus == LeadStatuses.Lost ||
                associatedLead.ConvertedCustomerId != customer.CustomerId)
            {
                return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.InvalidLead);
            }
        }

        var package = await _bookingRepository.GetActivePackageAsync(
            request.TravelPackageId, cancellationToken);
        if (package is null)
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.InvalidPackage);
        }

        var assignedToUserId = isAdmin ? request.AssignedToUserId : userId;
        if (assignedToUserId.HasValue &&
            !await _bookingRepository.IsAssignableStaffAsync(assignedToUserId.Value, cancellationToken))
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.InvalidAssignee);
        }

        var now = DateTime.UtcNow;
        var booking = CreateBooking(request, customer.CustomerId, package, assignedToUserId, userId, now);
        booking.LeadId = associatedLead?.LeadId;
        if (!BookingPricing.TryApply(booking, package))
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.InvalidState);
        }

        booking.BookingNumber = CreateBookingNumber(now);
        booking.BookingStatus = BookingStatuses.Inquiry;
        booking.CreatedAt = now;
        booking.IsActive = true;
        await _bookingRepository.AddAsync(booking, cancellationToken);
        await _bookingRepository.SaveChangesAsync(cancellationToken);

        var created = await _bookingRepository.GetByIdAsync(
            booking.BookingId, userId, isAdmin, false, cancellationToken);
        return new BookingOperationResult<BookingDetailsDto>(
            BookingOperationStatus.Success,
            await ToDetailsAsync(created!, userId, isAdmin, cancellationToken));
    }

    public async Task<BookingOperationResult<BookingDetailsDto>> UpdateAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        UpdateBookingRequestDto request,
        CancellationToken cancellationToken)
    {
        var requestStatus = ValidateDetails(request);
        if (requestStatus != BookingOperationStatus.Success)
        {
            return new BookingOperationResult<BookingDetailsDto>(requestStatus);
        }

        var booking = await _bookingRepository.GetByIdAsync(
            bookingId, userId, isAdmin, true, cancellationToken);
        if (booking is null)
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.NotFound);
        }

        if (booking.BookingStatus is BookingStatuses.Cancelled or BookingStatuses.Completed)
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.Conflict);
        }

        var existingPackageId = booking.TravelPackageId;
        if (booking.BookingStatus == BookingStatuses.Confirmed &&
            request.TravelPackageId != existingPackageId)
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.Conflict);
        }

        var package = await _bookingRepository.GetActivePackageAsync(
            request.TravelPackageId, cancellationToken);
        if (package is null)
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.InvalidPackage);
        }

        ApplyDetails(booking, request, package);
        var pricingValid = request.TravelPackageId == existingPackageId
            ? BookingPricing.TryApplySnapshot(booking)
            : BookingPricing.TryApply(booking, package);
        if (!pricingValid)
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.InvalidState);
        }

        booking.UpdatedAt = DateTime.UtcNow;
        await _bookingRepository.SaveChangesAsync(cancellationToken);

        var updated = await _bookingRepository.GetByIdAsync(
            bookingId, userId, isAdmin, false, cancellationToken);
        return new BookingOperationResult<BookingDetailsDto>(
            BookingOperationStatus.Success,
            await ToDetailsAsync(updated!, userId, isAdmin, cancellationToken));
    }

    public async Task<BookingOperationResult<BookingDetailsDto>> ChangeStatusAsync(
        int bookingId,
        int userId,
        bool isAdmin,
        string status,
        CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetByIdAsync(
            bookingId, userId, isAdmin, true, cancellationToken);
        if (booking is null)
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.NotFound);
        }

        if (!BookingStatuses.IsValid(status))
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.InvalidState);
        }

        if (!BookingStatuses.CanTransitionTo(booking.BookingStatus, status))
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.Conflict);
        }

        booking.BookingStatus = status;
        booking.UpdatedAt = DateTime.UtcNow;
        await _bookingRepository.SaveChangesAsync(cancellationToken);

        return new BookingOperationResult<BookingDetailsDto>(
            BookingOperationStatus.Success,
            await ToDetailsAsync(booking, userId, isAdmin, cancellationToken));
    }

    public async Task<BookingOperationResult<BookingDetailsDto>> AssignAsync(
        int bookingId,
        int? assignedToUserId,
        CancellationToken cancellationToken)
    {
        if (assignedToUserId.HasValue &&
            !await _bookingRepository.IsAssignableStaffAsync(assignedToUserId.Value, cancellationToken))
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.InvalidAssignee);
        }

        var booking = await _bookingRepository.GetByIdAsync(
            bookingId, 0, true, true, cancellationToken);
        if (booking is null)
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.NotFound);
        }

        if (booking.BookingStatus is BookingStatuses.Cancelled or BookingStatuses.Completed)
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.Conflict);
        }

        booking.AssignedToUserId = assignedToUserId;
        booking.UpdatedAt = DateTime.UtcNow;
        await _bookingRepository.SaveChangesAsync(cancellationToken);

        var updated = await _bookingRepository.GetByIdAsync(
            bookingId, 0, true, false, cancellationToken);
        return new BookingOperationResult<BookingDetailsDto>(
            BookingOperationStatus.Success,
            await ToDetailsAsync(updated!, 0, true, cancellationToken));
    }

    public async Task<IReadOnlyList<AssignableBookingStaffResponseDto>> GetAssignableStaffAsync(
        CancellationToken cancellationToken)
    {
        var staff = await _bookingRepository.GetAssignableStaffAsync(cancellationToken);
        return staff.Select(user =>
            new AssignableBookingStaffResponseDto(user.UserId, user.FullName, user.Email)).ToArray();
    }

    public async Task<BookingOperationResult<BookingDetailsDto>> CreateFromLeadAsync(
        int leadId,
        int userId,
        bool isAdmin,
        CreateBookingFromLeadRequestDto request,
        CancellationToken cancellationToken)
    {
        var requestStatus = ValidateDetails(request);
        if (requestStatus != BookingOperationStatus.Success)
        {
            return new BookingOperationResult<BookingDetailsDto>(requestStatus);
        }

        var package = await _bookingRepository.GetActivePackageAsync(
            request.TravelPackageId, cancellationToken);
        if (package is null)
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.InvalidPackage);
        }

        var assignedToUserId = isAdmin ? request.AssignedToUserId : userId;
        if (assignedToUserId.HasValue &&
            !await _bookingRepository.IsAssignableStaffAsync(assignedToUserId.Value, cancellationToken))
        {
            return new BookingOperationResult<BookingDetailsDto>(BookingOperationStatus.InvalidAssignee);
        }

        var booking = new Booking
        {
            TravelPackageId = package.TravelPackageId,
            TravelStartDate = request.TravelStartDate,
            TravelEndDate = request.TravelEndDate,
            NumberOfAdults = request.NumberOfAdults,
            NumberOfChildren = request.NumberOfChildren,
            NumberOfInfants = request.NumberOfInfants,
            DiscountAmount = request.DiscountAmount,
            AdditionalCharges = request.AdditionalCharges,
            SpecialRequests = NormalizeOptional(request.SpecialRequests),
            Travelers = ToTravelers(request.Travelers)
        };

        var created = await _bookingRepository.CreateFromLeadAsync(
            leadId,
            userId,
            isAdmin,
            userId,
            assignedToUserId,
            booking,
            cancellationToken);
        if (created.Status != BookingOperationStatus.Success)
        {
            return new BookingOperationResult<BookingDetailsDto>(created.Status);
        }

        var result = await _bookingRepository.GetByIdAsync(
            created.Value!.BookingId, userId, isAdmin, false, cancellationToken);
        return new BookingOperationResult<BookingDetailsDto>(
            BookingOperationStatus.Success,
            await ToDetailsAsync(result!, userId, isAdmin, cancellationToken));
    }

    private static BookingOperationStatus ValidateDetails(BookingDetailsRequestDto request)
    {
        if (request.TravelStartDate == default ||
            request.TravelEndDate == default ||
            request.TravelEndDate < request.TravelStartDate ||
            request.NumberOfAdults < 0 ||
            request.NumberOfChildren < 0 ||
            request.NumberOfInfants < 0 ||
            request.NumberOfAdults + request.NumberOfChildren + request.NumberOfInfants is < 1 or > 100 ||
            request.DiscountAmount < 0 ||
            request.AdditionalCharges < 0)
        {
            return BookingOperationStatus.InvalidState;
        }

        if (request.Travelers is null or { Count: 0 })
        {
            return BookingOperationStatus.Success;
        }

        if (request.Travelers.Any(traveler =>
                string.IsNullOrWhiteSpace(traveler.FullName) ||
                !TravelerTypes.IsValid(traveler.TravelerType) ||
                traveler.DateOfBirth > DateOnly.FromDateTime(DateTime.UtcNow)) ||
            request.Travelers.Count != request.NumberOfAdults + request.NumberOfChildren + request.NumberOfInfants ||
            request.Travelers.Count(traveler => traveler.TravelerType == TravelerTypes.Adult) != request.NumberOfAdults ||
            request.Travelers.Count(traveler => traveler.TravelerType == TravelerTypes.Child) != request.NumberOfChildren ||
            request.Travelers.Count(traveler => traveler.TravelerType == TravelerTypes.Infant) != request.NumberOfInfants)
        {
            return BookingOperationStatus.InvalidTravelers;
        }

        return BookingOperationStatus.Success;
    }

    private static Booking CreateBooking(
        BookingDetailsRequestDto request,
        int customerId,
        TravelPackage package,
        int? assignedToUserId,
        int createdByUserId,
        DateTime createdAt)
    {
        var booking = new Booking
        {
            CustomerId = customerId,
            TravelPackageId = package.TravelPackageId,
            TravelPackage = package,
            AssignedToUserId = assignedToUserId,
            TravelStartDate = request.TravelStartDate,
            TravelEndDate = request.TravelEndDate,
            NumberOfAdults = request.NumberOfAdults,
            NumberOfChildren = request.NumberOfChildren,
            NumberOfInfants = request.NumberOfInfants,
            DiscountAmount = request.DiscountAmount,
            AdditionalCharges = request.AdditionalCharges,
            SpecialRequests = NormalizeOptional(request.SpecialRequests),
            CreatedByUserId = createdByUserId,
            CreatedAt = createdAt,
            Travelers = ToTravelers(request.Travelers)
        };
        return booking;
    }

    private static void ApplyDetails(
        Booking booking,
        BookingDetailsRequestDto request,
        TravelPackage package)
    {
        booking.TravelPackageId = package.TravelPackageId;
        booking.TravelPackage = package;
        booking.TravelStartDate = request.TravelStartDate;
        booking.TravelEndDate = request.TravelEndDate;
        booking.NumberOfAdults = request.NumberOfAdults;
        booking.NumberOfChildren = request.NumberOfChildren;
        booking.NumberOfInfants = request.NumberOfInfants;
        booking.DiscountAmount = request.DiscountAmount;
        booking.AdditionalCharges = request.AdditionalCharges;
        booking.SpecialRequests = NormalizeOptional(request.SpecialRequests);
        booking.Travelers.Clear();
        foreach (var traveler in ToTravelers(request.Travelers))
        {
            booking.Travelers.Add(traveler);
        }
    }

    private static List<BookingTraveler> ToTravelers(IReadOnlyList<BookingTravelerRequestDto>? travelers) =>
        travelers?.Select(traveler => new BookingTraveler
        {
            FullName = traveler.FullName.Trim(),
            DateOfBirth = traveler.DateOfBirth,
            Gender = NormalizeOptional(traveler.Gender),
            TravelerType = traveler.TravelerType
        }).ToList() ?? [];

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string CreateBookingNumber(DateTime createdAt) =>
        $"BK-{createdAt:yyyyMMdd}-{Guid.NewGuid():N}"[..20].ToUpperInvariant();

    private static BookingSummaryDto ToSummary(
        Booking booking,
        BookingPaymentTotals totals) =>
        new(
            booking.BookingId,
            booking.BookingNumber,
            booking.CustomerId,
            booking.Customer.FullName,
            booking.TravelPackageId,
            booking.TravelPackage.PackageName,
            booking.TravelPackage.Destination,
            booking.TravelStartDate,
            booking.TravelEndDate,
            booking.NumberOfAdults,
            booking.NumberOfChildren,
            booking.NumberOfInfants,
            booking.TotalAmount,
            booking.Currency,
            booking.BookingStatus,
            CreatePaymentSummary(booking.TotalAmount, booking.Currency, totals),
            booking.AssignedToUserId,
            booking.AssignedToUser?.FullName,
            ToUtc(booking.CreatedAt),
            booking.IsActive);

    private async Task<BookingDetailsDto> ToDetailsAsync(
        Booking booking,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var totals = await _paymentRepository.GetTotalsAsync(
            booking.BookingId, userId, isAdmin, cancellationToken);

        return new BookingDetailsDto(
            booking.BookingId,
            booking.BookingNumber,
            booking.CustomerId,
            booking.Customer.FullName,
            booking.Customer.Email,
            booking.Customer.Phone,
            booking.LeadId,
            booking.Lead?.LeadNumber,
            booking.TravelPackageId,
            booking.TravelPackage.PackageName,
            booking.TravelPackage.Destination,
            booking.TravelPackage.Country,
            booking.TravelStartDate,
            booking.TravelEndDate,
            booking.NumberOfAdults,
            booking.NumberOfChildren,
            booking.NumberOfInfants,
            booking.AdultPrice,
            booking.ChildPrice,
            booking.InfantPrice,
            booking.BaseAmount,
            booking.DiscountAmount,
            booking.AdditionalCharges,
            booking.TotalAmount,
            booking.Currency,
            booking.BookingStatus,
            booking.SpecialRequests,
            booking.AssignedToUserId,
            booking.AssignedToUser?.FullName,
            booking.Travelers
                .OrderBy(traveler => traveler.BookingTravelerId)
                .Select(traveler => new BookingTravelerResponseDto(
                    traveler.BookingTravelerId,
                    traveler.FullName,
                    traveler.DateOfBirth,
                    traveler.Gender,
                    traveler.TravelerType))
                .ToArray(),
            CreatePaymentSummary(booking.TotalAmount, booking.Currency, totals),
            booking.CreatedByUserId,
            booking.CreatedByUser.FullName,
            ToUtc(booking.CreatedAt),
            booking.UpdatedAt is { } updatedAt ? ToUtc(updatedAt) : null,
            booking.IsActive);
    }

    private static BookingPaymentSummaryDto CreatePaymentSummary(
        decimal bookingTotal,
        string currency,
        BookingPaymentTotals totals)
    {
        var status = totals.NetPaid <= 0m
            ? "Unpaid"
            : totals.NetPaid < bookingTotal
                ? "Partially Paid"
                : totals.NetPaid == bookingTotal
                    ? "Paid"
                    : "Overpaid";

        return new BookingPaymentSummaryDto(
            bookingTotal,
            currency,
            totals.GrossPaid,
            totals.RefundedAmount,
            totals.NetPaid,
            bookingTotal - totals.NetPaid,
            status,
            totals.PendingAmount);
    }

    private static DateTime ToUtc(DateTime value) =>
        DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
