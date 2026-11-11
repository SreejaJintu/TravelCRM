namespace TravelCRM.Api.Models;

public class TravelPackage
{
    public int TravelPackageId { get; set; }
    public string PackageCode { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string PackageType { get; set; } = string.Empty;
    public int DurationDays { get; set; }
    public int DurationNights { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public decimal AdultPrice { get; set; }
    public decimal ChildPrice { get; set; }
    public decimal InfantPrice { get; set; }
    public string Currency { get; set; } = "USD";
    public string? CoverImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public int CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<PackageItinerary> Itinerary { get; set; } = new List<PackageItinerary>();
    public ICollection<PackageImage> Images { get; set; } = new List<PackageImage>();
    public ICollection<PackageInclusion> Inclusions { get; set; } = new List<PackageInclusion>();
    public ICollection<PackageExclusion> Exclusions { get; set; } = new List<PackageExclusion>();
}

public class PackageItinerary
{
    public int ItineraryId { get; set; }
    public int TravelPackageId { get; set; }
    public TravelPackage TravelPackage { get; set; } = null!;
    public int DayNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Accommodation { get; set; }
    public string? MealsIncluded { get; set; }
}

public class PackageImage
{
    public int PackageImageId { get; set; }
    public int TravelPackageId { get; set; }
    public TravelPackage TravelPackage { get; set; } = null!;
    public string ImageUrl { get; set; } = string.Empty;
    public string PublicId { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsPrimary { get; set; }
    public bool CleanupPending { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class PackageInclusion
{
    public int InclusionId { get; set; }
    public int TravelPackageId { get; set; }
    public TravelPackage TravelPackage { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
}

public class PackageExclusion
{
    public int ExclusionId { get; set; }
    public int TravelPackageId { get; set; }
    public TravelPackage TravelPackage { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
}
