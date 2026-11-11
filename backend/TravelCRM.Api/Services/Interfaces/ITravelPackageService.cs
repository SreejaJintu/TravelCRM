using Microsoft.AspNetCore.Http;
using TravelCRM.Api.DTOs.Packages;

namespace TravelCRM.Api.Services.Interfaces;

public interface ITravelPackageService
{
    Task<PagedTravelPackagesResponseDto<TravelPackageSummaryDto>> GetPagedAsync(
        string? search, string? packageType, int? minDurationDays, int? maxDurationDays,
        decimal? minPrice, decimal? maxPrice, bool activeOnly, int page, int pageSize,
        CancellationToken cancellationToken);
    Task<TravelPackageDetailsDto?> GetByIdAsync(int packageId, bool includeInactive, CancellationToken cancellationToken);
    Task<TravelPackageDetailsDto> CreateAsync(int createdByUserId, CreateTravelPackageRequestDto request, CancellationToken cancellationToken);
    Task<TravelPackageDetailsDto?> UpdateAsync(int packageId, UpdateTravelPackageRequestDto request, CancellationToken cancellationToken);
    Task<bool?> SetActiveAsync(int packageId, bool isActive, CancellationToken cancellationToken);
    Task<PackageItineraryResponseDto?> AddItineraryAsync(int packageId, CreateItineraryRequestDto request, CancellationToken cancellationToken);
    Task<PackageItineraryResponseDto?> UpdateItineraryAsync(int packageId, int itineraryId, UpdateItineraryRequestDto request, CancellationToken cancellationToken);
    Task<bool> DeleteItineraryAsync(int packageId, int itineraryId, CancellationToken cancellationToken);
    Task<int?> AddInclusionAsync(int packageId, PackageDescriptionRequestDto request, CancellationToken cancellationToken);
    Task<int?> AddExclusionAsync(int packageId, PackageDescriptionRequestDto request, CancellationToken cancellationToken);
    Task<bool> UpdateInclusionAsync(int packageId, int inclusionId, PackageDescriptionRequestDto request, CancellationToken cancellationToken);
    Task<bool> UpdateExclusionAsync(int packageId, int exclusionId, PackageDescriptionRequestDto request, CancellationToken cancellationToken);
    Task<bool> DeleteInclusionAsync(int packageId, int inclusionId, CancellationToken cancellationToken);
    Task<bool> DeleteExclusionAsync(int packageId, int exclusionId, CancellationToken cancellationToken);
    Task<IReadOnlyList<PackageImageResponseDto>?> UploadImagesAsync(int packageId, IReadOnlyList<IFormFile> files, CancellationToken cancellationToken);
    Task<PackageImageResponseDto?> SetPrimaryImageAsync(int packageId, int imageId, CancellationToken cancellationToken);
    Task<bool> UpdateImageOrderAsync(int packageId, UpdateImageOrderRequestDto request, CancellationToken cancellationToken);
    Task<PackageImageResponseDto?> ReplaceImageAsync(int packageId, int imageId, IFormFile file, CancellationToken cancellationToken);
    Task<bool> DeleteImageAsync(int packageId, int imageId, CancellationToken cancellationToken);
}
