using TravelCRM.Api.Models;

namespace TravelCRM.Api.Repositories.Interfaces;

public interface ITravelPackageRepository
{
    Task<(IReadOnlyList<TravelPackage> Items, int TotalCount)> GetPagedAsync(
        string? search,
        string? packageType,
        int? minDurationDays,
        int? maxDurationDays,
        decimal? minPrice,
        decimal? maxPrice,
        bool activeOnly,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<TravelPackage?> GetByIdAsync(int packageId, bool includeInactive, CancellationToken cancellationToken);
    Task<bool> PackageCodeExistsAsync(string packageCode, int? exceptPackageId, CancellationToken cancellationToken);
    Task AddPackageAsync(TravelPackage package, CancellationToken cancellationToken);
    Task<PackageItinerary?> GetItineraryAsync(int packageId, int itineraryId, CancellationToken cancellationToken);
    Task<bool> ItineraryDayExistsAsync(int packageId, int dayNumber, int? exceptItineraryId, CancellationToken cancellationToken);
    Task<PackageInclusion?> GetInclusionAsync(int packageId, int inclusionId, CancellationToken cancellationToken);
    Task<PackageExclusion?> GetExclusionAsync(int packageId, int exclusionId, CancellationToken cancellationToken);
    Task<PackageImage?> GetImageAsync(int packageId, int imageId, CancellationToken cancellationToken);
    Task<IReadOnlyList<PackageImage>> GetImagesAsync(int packageId, CancellationToken cancellationToken);
    Task AddItineraryAsync(PackageItinerary itinerary, CancellationToken cancellationToken);
    Task AddInclusionAsync(PackageInclusion inclusion, CancellationToken cancellationToken);
    Task AddExclusionAsync(PackageExclusion exclusion, CancellationToken cancellationToken);
    Task AddImageAsync(PackageImage image, CancellationToken cancellationToken);
    void RemoveItinerary(PackageItinerary itinerary);
    void RemoveInclusion(PackageInclusion inclusion);
    void RemoveExclusion(PackageExclusion exclusion);
    void RemoveImage(PackageImage image);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
