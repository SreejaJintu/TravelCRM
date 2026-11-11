using Microsoft.EntityFrameworkCore;
using TravelCRM.Api.Data;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;

namespace TravelCRM.Api.Repositories;

public sealed class TravelPackageRepository : ITravelPackageRepository
{
    private readonly ApplicationDbContext _context;

    public TravelPackageRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<(IReadOnlyList<TravelPackage> Items, int TotalCount)> GetPagedAsync(
        string? search,
        string? packageType,
        int? minDurationDays,
        int? maxDurationDays,
        decimal? minPrice,
        decimal? maxPrice,
        bool activeOnly,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        IQueryable<TravelPackage> query = _context.TravelPackages.AsNoTracking();
        if (activeOnly) query = query.Where(package => package.IsActive);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(package =>
                package.PackageName.Contains(term) ||
                package.Destination.Contains(term) ||
                package.Country.Contains(term) ||
                package.PackageCode.Contains(term));
        }
        if (!string.IsNullOrWhiteSpace(packageType))
            query = query.Where(package => package.PackageType == packageType);
        if (minDurationDays.HasValue)
            query = query.Where(package => package.DurationDays >= minDurationDays.Value);
        if (maxDurationDays.HasValue)
            query = query.Where(package => package.DurationDays <= maxDurationDays.Value);
        if (minPrice.HasValue)
            query = query.Where(package => package.BasePrice >= minPrice.Value);
        if (maxPrice.HasValue)
            query = query.Where(package => package.BasePrice <= maxPrice.Value);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(package => package.PackageName)
            .ThenBy(package => package.TravelPackageId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        return (items, totalCount);
    }

    public Task<TravelPackage?> GetByIdAsync(
        int packageId,
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        var query = _context.TravelPackages
            .Include(package => package.Itinerary.OrderBy(item => item.DayNumber))
            .Include(package => package.Images.OrderBy(image => image.DisplayOrder))
            .Include(package => package.Inclusions.OrderBy(item => item.InclusionId))
            .Include(package => package.Exclusions.OrderBy(item => item.ExclusionId))
            .AsSplitQuery();
        if (!includeInactive) query = query.Where(package => package.IsActive);
        return query.FirstOrDefaultAsync(package => package.TravelPackageId == packageId, cancellationToken);
    }

    public Task<bool> PackageCodeExistsAsync(string packageCode, int? exceptPackageId, CancellationToken cancellationToken)
    {
        return _context.TravelPackages.AnyAsync(
            package => package.PackageCode == packageCode &&
                (!exceptPackageId.HasValue || package.TravelPackageId != exceptPackageId.Value),
            cancellationToken);
    }

    public async Task AddPackageAsync(TravelPackage package, CancellationToken cancellationToken)
    {
        await _context.TravelPackages.AddAsync(package, cancellationToken);
    }

    public Task<PackageItinerary?> GetItineraryAsync(int packageId, int itineraryId, CancellationToken cancellationToken) =>
        _context.PackageItinerary.FirstOrDefaultAsync(
            item => item.TravelPackageId == packageId && item.ItineraryId == itineraryId, cancellationToken);

    public Task<bool> ItineraryDayExistsAsync(
        int packageId,
        int dayNumber,
        int? exceptItineraryId,
        CancellationToken cancellationToken) =>
        _context.PackageItinerary.AnyAsync(item =>
            item.TravelPackageId == packageId &&
            item.DayNumber == dayNumber &&
            (!exceptItineraryId.HasValue || item.ItineraryId != exceptItineraryId.Value),
            cancellationToken);

    public Task<PackageInclusion?> GetInclusionAsync(int packageId, int inclusionId, CancellationToken cancellationToken) =>
        _context.PackageInclusions.FirstOrDefaultAsync(
            item => item.TravelPackageId == packageId && item.InclusionId == inclusionId, cancellationToken);

    public Task<PackageExclusion?> GetExclusionAsync(int packageId, int exclusionId, CancellationToken cancellationToken) =>
        _context.PackageExclusions.FirstOrDefaultAsync(
            item => item.TravelPackageId == packageId && item.ExclusionId == exclusionId, cancellationToken);

    public Task<PackageImage?> GetImageAsync(int packageId, int imageId, CancellationToken cancellationToken) =>
        _context.PackageImages.FirstOrDefaultAsync(
            image => image.TravelPackageId == packageId && image.PackageImageId == imageId, cancellationToken);

    public async Task<IReadOnlyList<PackageImage>> GetImagesAsync(int packageId, CancellationToken cancellationToken) =>
        await _context.PackageImages
            .Where(image => image.TravelPackageId == packageId && !image.CleanupPending)
            .OrderBy(image => image.DisplayOrder)
            .ToListAsync(cancellationToken);

    public async Task AddItineraryAsync(PackageItinerary itinerary, CancellationToken cancellationToken) =>
        await _context.PackageItinerary.AddAsync(itinerary, cancellationToken);

    public async Task AddInclusionAsync(PackageInclusion inclusion, CancellationToken cancellationToken) =>
        await _context.PackageInclusions.AddAsync(inclusion, cancellationToken);

    public async Task AddExclusionAsync(PackageExclusion exclusion, CancellationToken cancellationToken) =>
        await _context.PackageExclusions.AddAsync(exclusion, cancellationToken);

    public async Task AddImageAsync(PackageImage image, CancellationToken cancellationToken) =>
        await _context.PackageImages.AddAsync(image, cancellationToken);

    public void RemoveItinerary(PackageItinerary itinerary) => _context.PackageItinerary.Remove(itinerary);
    public void RemoveInclusion(PackageInclusion inclusion) => _context.PackageInclusions.Remove(inclusion);
    public void RemoveExclusion(PackageExclusion exclusion) => _context.PackageExclusions.Remove(exclusion);
    public void RemoveImage(PackageImage image) => _context.PackageImages.Remove(image);
    public Task SaveChangesAsync(CancellationToken cancellationToken) => _context.SaveChangesAsync(cancellationToken);
}
