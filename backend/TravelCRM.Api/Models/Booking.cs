namespace TravelCRM.Api.Models;

public static class BookingStatuses
{
    public const string Inquiry = "Inquiry";
    public const string Quotation = "Quotation";
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string Cancelled = "Cancelled";
    public const string Completed = "Completed";

    public static bool IsValid(string value) =>
        value is Inquiry or Quotation or Pending or Confirmed or Cancelled or Completed;

    public static bool CanTransitionTo(string current, string next) =>
        (current, next) switch
        {
            (Inquiry, Quotation or Pending or Cancelled) => true,
            (Quotation, Pending or Confirmed or Cancelled) => true,
            (Pending, Confirmed or Cancelled) => true,
            (Confirmed, Completed or Cancelled) => true,
            _ => false
        };
}

public static class TravelerTypes
{
    public const string Adult = "Adult";
    public const string Child = "Child";
    public const string Infant = "Infant";

    public static bool IsValid(string value) => value is Adult or Child or Infant;
}

public class Booking
{
    public int BookingId { get; set; }
    public string BookingNumber { get; set; } = string.Empty;
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public int? LeadId { get; set; }
    public Lead? Lead { get; set; }
    public int TravelPackageId { get; set; }
    public TravelPackage TravelPackage { get; set; } = null!;
    public int? AssignedToUserId { get; set; }
    public User? AssignedToUser { get; set; }
    public DateOnly TravelStartDate { get; set; }
    public DateOnly TravelEndDate { get; set; }
    public int NumberOfAdults { get; set; }
    public int NumberOfChildren { get; set; }
    public int NumberOfInfants { get; set; }
    public decimal AdultPrice { get; set; }
    public decimal ChildPrice { get; set; }
    public decimal InfantPrice { get; set; }
    public decimal BaseAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal AdditionalCharges { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string BookingStatus { get; set; } = BookingStatuses.Inquiry;
    public string? SpecialRequests { get; set; }
    public int CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<BookingTraveler> Travelers { get; set; } = new List<BookingTraveler>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class BookingTraveler
{
    public int BookingTravelerId { get; set; }
    public int BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    public string FullName { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string TravelerType { get; set; } = TravelerTypes.Adult;
}

public enum BookingOperationStatus
{
    Success,
    NotFound,
    InvalidCustomer,
    InvalidLead,
    InvalidPackage,
    InvalidAssignee,
    InvalidTravelers,
    InvalidState,
    EmailRequired,
    AmbiguousCustomer,
    Conflict
}

public sealed record BookingOperationResult<T>(
    BookingOperationStatus Status,
    T? Value = default);
