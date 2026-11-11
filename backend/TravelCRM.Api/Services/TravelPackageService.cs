using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using TravelCRM.Api.DTOs.Packages;
using TravelCRM.Api.Models;
using TravelCRM.Api.Repositories.Interfaces;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Services;

public sealed class TravelPackageService : ITravelPackageService
{
    private readonly ITravelPackageRepository _repository;
    private readonly IPackageImageStorage _imageStorage;
    private readonly PackageImageOptions _imageOptions;
    private readonly ILogger<TravelPackageService> _logger;

    public TravelPackageService(
        ITravelPackageRepository repository,
        IPackageImageStorage imageStorage,
        IOptions<PackageImageOptions> imageOptions,
        ILogger<TravelPackageService> logger)
    {
        _repository = repository;
        _imageStorage = imageStorage;
        _imageOptions = imageOptions.Value;
        _logger = logger;
    }

    public async Task<PagedTravelPackagesResponseDto<TravelPackageSummaryDto>> GetPagedAsync(
        string? search, string? packageType, int? minDurationDays, int? maxDurationDays,
        decimal? minPrice, decimal? maxPrice, bool activeOnly, int page, int pageSize,
        CancellationToken cancellationToken)
    {
        if (minDurationDays.HasValue && maxDurationDays.HasValue && minDurationDays > maxDurationDays)
            throw new ArgumentException("Minimum duration must not exceed maximum duration.");
        if (minPrice.HasValue && maxPrice.HasValue && minPrice > maxPrice)
            throw new ArgumentException("Minimum price must not exceed maximum price.");

        var (items, totalCount) = await _repository.GetPagedAsync(
            search, packageType, minDurationDays, maxDurationDays, minPrice, maxPrice,
            activeOnly, page, pageSize, cancellationToken);
        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);
        return new PagedTravelPackagesResponseDto<TravelPackageSummaryDto>(
            items.Select(ToSummary).ToArray(), page, pageSize, totalCount, totalPages);
    }

    public async Task<TravelPackageDetailsDto?> GetByIdAsync(
        int packageId, bool includeInactive, CancellationToken cancellationToken)
    {
        var package = await _repository.GetByIdAsync(packageId, includeInactive, cancellationToken);
        return package is null ? null : ToDetails(package);
    }

    public async Task<TravelPackageDetailsDto> CreateAsync(
        int createdByUserId, CreateTravelPackageRequestDto request, CancellationToken cancellationToken)
    {
        var code = request.PackageCode.Trim().ToUpperInvariant();
        if (await _repository.PackageCodeExistsAsync(code, null, cancellationToken))
            throw new PackageConflictException("A package with this code already exists.");

        var package = new TravelPackage { CreatedByUserId = createdByUserId };
        Apply(package, request);
        package.CreatedAt = DateTime.UtcNow;
        await _repository.AddPackageAsync(package, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        var saved = await _repository.GetByIdAsync(package.TravelPackageId, true, cancellationToken);
        return ToDetails(saved!);
    }

    public async Task<TravelPackageDetailsDto?> UpdateAsync(
        int packageId, UpdateTravelPackageRequestDto request, CancellationToken cancellationToken)
    {
        var package = await _repository.GetByIdAsync(packageId, true, cancellationToken);
        if (package is null) return null;

        var code = request.PackageCode.Trim().ToUpperInvariant();
        if (await _repository.PackageCodeExistsAsync(code, packageId, cancellationToken))
            throw new PackageConflictException("A package with this code already exists.");
        if (package.Itinerary.Any(item => item.DayNumber > request.DurationDays))
            throw new PackageConflictException("Remove itinerary days beyond the new duration before shortening this package.");

        Apply(package, request);
        package.UpdatedAt = DateTime.UtcNow;
        await _repository.SaveChangesAsync(cancellationToken);
        return ToDetails(package);
    }

    public async Task<bool?> SetActiveAsync(int packageId, bool isActive, CancellationToken cancellationToken)
    {
        var package = await _repository.GetByIdAsync(packageId, true, cancellationToken);
        if (package is null) return null;
        package.IsActive = isActive;
        package.UpdatedAt = DateTime.UtcNow;
        await _repository.SaveChangesAsync(cancellationToken);
        return package.IsActive;
    }

    public async Task<PackageItineraryResponseDto?> AddItineraryAsync(
        int packageId, CreateItineraryRequestDto request, CancellationToken cancellationToken)
    {
        var package = await _repository.GetByIdAsync(packageId, true, cancellationToken);
        if (package is null) return null;
        ValidateDay(package, request.DayNumber);
        if (await _repository.ItineraryDayExistsAsync(packageId, request.DayNumber, null, cancellationToken))
            throw new PackageConflictException("An itinerary entry already exists for that day.");
        var itinerary = new PackageItinerary
        {
            TravelPackageId = packageId,
            DayNumber = request.DayNumber,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Accommodation = Normalize(request.Accommodation),
            MealsIncluded = Normalize(request.MealsIncluded)
        };
        await _repository.AddItineraryAsync(itinerary, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return ToResponse(itinerary);
    }

    public async Task<PackageItineraryResponseDto?> UpdateItineraryAsync(
        int packageId, int itineraryId, UpdateItineraryRequestDto request, CancellationToken cancellationToken)
    {
        var package = await _repository.GetByIdAsync(packageId, true, cancellationToken);
        var itinerary = await _repository.GetItineraryAsync(packageId, itineraryId, cancellationToken);
        if (package is null || itinerary is null) return null;
        ValidateDay(package, request.DayNumber);
        if (await _repository.ItineraryDayExistsAsync(packageId, request.DayNumber, itineraryId, cancellationToken))
            throw new PackageConflictException("An itinerary entry already exists for that day.");
        itinerary.DayNumber = request.DayNumber;
        itinerary.Title = request.Title.Trim();
        itinerary.Description = request.Description.Trim();
        itinerary.Accommodation = Normalize(request.Accommodation);
        itinerary.MealsIncluded = Normalize(request.MealsIncluded);
        await _repository.SaveChangesAsync(cancellationToken);
        return ToResponse(itinerary);
    }

    public async Task<bool> DeleteItineraryAsync(int packageId, int itineraryId, CancellationToken cancellationToken)
    {
        var itinerary = await _repository.GetItineraryAsync(packageId, itineraryId, cancellationToken);
        if (itinerary is null) return false;
        _repository.RemoveItinerary(itinerary);
        await _repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<int?> AddInclusionAsync(int packageId, PackageDescriptionRequestDto request, CancellationToken cancellationToken)
    {
        if (await _repository.GetByIdAsync(packageId, true, cancellationToken) is null) return null;
        var item = new PackageInclusion { TravelPackageId = packageId, Description = request.Description.Trim() };
        await _repository.AddInclusionAsync(item, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return item.InclusionId;
    }

    public async Task<int?> AddExclusionAsync(int packageId, PackageDescriptionRequestDto request, CancellationToken cancellationToken)
    {
        if (await _repository.GetByIdAsync(packageId, true, cancellationToken) is null) return null;
        var item = new PackageExclusion { TravelPackageId = packageId, Description = request.Description.Trim() };
        await _repository.AddExclusionAsync(item, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return item.ExclusionId;
    }

    public async Task<bool> UpdateInclusionAsync(int packageId, int inclusionId, PackageDescriptionRequestDto request, CancellationToken cancellationToken)
    {
        var item = await _repository.GetInclusionAsync(packageId, inclusionId, cancellationToken);
        if (item is null) return false;
        item.Description = request.Description.Trim();
        await _repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> UpdateExclusionAsync(int packageId, int exclusionId, PackageDescriptionRequestDto request, CancellationToken cancellationToken)
    {
        var item = await _repository.GetExclusionAsync(packageId, exclusionId, cancellationToken);
        if (item is null) return false;
        item.Description = request.Description.Trim();
        await _repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteInclusionAsync(int packageId, int inclusionId, CancellationToken cancellationToken)
    {
        var item = await _repository.GetInclusionAsync(packageId, inclusionId, cancellationToken);
        if (item is null) return false;
        _repository.RemoveInclusion(item);
        await _repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteExclusionAsync(int packageId, int exclusionId, CancellationToken cancellationToken)
    {
        var item = await _repository.GetExclusionAsync(packageId, exclusionId, cancellationToken);
        if (item is null) return false;
        _repository.RemoveExclusion(item);
        await _repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<PackageImageResponseDto>?> UploadImagesAsync(
        int packageId, IReadOnlyList<IFormFile> files, CancellationToken cancellationToken)
    {
        var package = await _repository.GetByIdAsync(packageId, true, cancellationToken);
        if (package is null) return null;
        if (files.Count is < 1 or > 10) throw new ArgumentException("Choose between 1 and 10 images.");
        var validated = new List<(string Name, byte[] Content)>();
        foreach (var file in files) validated.Add(await ValidateImageAsync(file, cancellationToken));

        var uploaded = new List<StoredPackageImage>();
        try
        {
            foreach (var file in validated)
            {
                await using var stream = new MemoryStream(file.Content, writable: false);
                uploaded.Add(await _imageStorage.UploadAsync(
                    stream, file.Name, $"travelcrm/packages/{package.PackageCode}", cancellationToken));
            }

            var startOrder = package.Images.Count == 0 ? 0 : package.Images.Max(image => image.DisplayOrder) + 1;
            var needsPrimary = package.Images.All(image => !image.IsPrimary);
            for (var index = 0; index < uploaded.Count; index++)
            {
                await _repository.AddImageAsync(new PackageImage
                {
                    TravelPackageId = packageId,
                    ImageUrl = uploaded[index].ImageUrl,
                    PublicId = uploaded[index].PublicId,
                    DisplayOrder = startOrder + index,
                    IsPrimary = needsPrimary && index == 0,
                    CreatedAt = DateTime.UtcNow
                }, cancellationToken);
            }
            if (needsPrimary)
            {
                package.CoverImageUrl = uploaded[0].ImageUrl;
                package.UpdatedAt = DateTime.UtcNow;
            }
            await _repository.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await CleanupUploadedAsync(uploaded, cancellationToken);
            throw;
        }

        var images = await _repository.GetImagesAsync(packageId, cancellationToken);
        return images.Where(image => uploaded.Any(item => item.PublicId == image.PublicId))
            .Select(ToResponse).ToArray();
    }

    public async Task<PackageImageResponseDto?> SetPrimaryImageAsync(
        int packageId, int imageId, CancellationToken cancellationToken)
    {
        var package = await _repository.GetByIdAsync(packageId, true, cancellationToken);
        var image = await _repository.GetImageAsync(packageId, imageId, cancellationToken);
        if (package is null || image is null || image.CleanupPending) return null;
        var current = package.Images.FirstOrDefault(item => item.IsPrimary && item.PackageImageId != imageId);
        if (current is not null)
        {
            current.IsPrimary = false;
            await _repository.SaveChangesAsync(cancellationToken);
        }
        image.IsPrimary = true;
        package.CoverImageUrl = image.ImageUrl;
        package.UpdatedAt = DateTime.UtcNow;
        await _repository.SaveChangesAsync(cancellationToken);
        return ToResponse(image);
    }

    public async Task<bool> UpdateImageOrderAsync(
        int packageId, UpdateImageOrderRequestDto request, CancellationToken cancellationToken)
    {
        var images = await _repository.GetImagesAsync(packageId, cancellationToken);
        if (images.Count == 0) return false;
        if (request.Images.Count != images.Count ||
            request.Images.Select(item => item.PackageImageId).Distinct().Count() != images.Count ||
            request.Images.Any(item => images.All(image => image.PackageImageId != item.PackageImageId)))
            throw new ArgumentException("Provide each package image exactly once.");
        foreach (var item in request.Images)
            images.Single(image => image.PackageImageId == item.PackageImageId).DisplayOrder = item.DisplayOrder;
        await _repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<PackageImageResponseDto?> ReplaceImageAsync(
        int packageId, int imageId, IFormFile file, CancellationToken cancellationToken)
    {
        var package = await _repository.GetByIdAsync(packageId, true, cancellationToken);
        var oldImage = await _repository.GetImageAsync(packageId, imageId, cancellationToken);
        if (package is null || oldImage is null || oldImage.CleanupPending) return null;
        var validated = await ValidateImageAsync(file, cancellationToken);
        StoredPackageImage uploaded;
        await using (var stream = new MemoryStream(validated.Content, writable: false))
        {
            uploaded = await _imageStorage.UploadAsync(
                stream, validated.Name, $"travelcrm/packages/{package.PackageCode}", cancellationToken);
        }

        var wasPrimary = oldImage.IsPrimary;
        var replacement = new PackageImage
        {
            TravelPackageId = packageId,
            ImageUrl = uploaded.ImageUrl,
            PublicId = uploaded.PublicId,
            DisplayOrder = oldImage.DisplayOrder,
            IsPrimary = false,
            CreatedAt = DateTime.UtcNow
        };
        if (wasPrimary)
        {
            oldImage.IsPrimary = false;
            await _repository.SaveChangesAsync(cancellationToken);
        }

        await _repository.AddImageAsync(replacement, cancellationToken);
        package.UpdatedAt = DateTime.UtcNow;
        try
        {
            await _repository.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await CleanupUploadedAsync([uploaded], cancellationToken);
            throw;
        }

        if (wasPrimary)
        {
            oldImage.IsPrimary = false;
            await _repository.SaveChangesAsync(cancellationToken);
            replacement.IsPrimary = true;
            package.CoverImageUrl = replacement.ImageUrl;
            await _repository.SaveChangesAsync(cancellationToken);
        }

        try
        {
            await _imageStorage.DeleteAsync(oldImage.PublicId, cancellationToken);
            _repository.RemoveImage(oldImage);
            await _repository.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            oldImage.CleanupPending = true;
            await _repository.SaveChangesAsync(cancellationToken);
            _logger.LogError(exception,
                "Cloudinary cleanup for replaced package image {PublicId} is pending. Retry by deleting image {PackageImageId}.",
                oldImage.PublicId, oldImage.PackageImageId);
        }
        return ToResponse(replacement);
    }

    public async Task<bool> DeleteImageAsync(int packageId, int imageId, CancellationToken cancellationToken)
    {
        var package = await _repository.GetByIdAsync(packageId, true, cancellationToken);
        var image = await _repository.GetImageAsync(packageId, imageId, cancellationToken);
        if (package is null || image is null) return false;

        if (!image.CleanupPending)
        {
            image.CleanupPending = true;
            if (image.IsPrimary)
            {
                image.IsPrimary = false;
                await _repository.SaveChangesAsync(cancellationToken);
                var next = (await _repository.GetImagesAsync(packageId, cancellationToken))
                    .FirstOrDefault(candidate => candidate.PackageImageId != imageId);
                if (next is not null)
                {
                    next.IsPrimary = true;
                    package.CoverImageUrl = next.ImageUrl;
                }
                else
                {
                    package.CoverImageUrl = null;
                }
                package.UpdatedAt = DateTime.UtcNow;
            }
            await _repository.SaveChangesAsync(cancellationToken);
        }

        try
        {
            await _imageStorage.DeleteAsync(image.PublicId, cancellationToken);
        }
        catch (ImageStorageUnavailableException exception)
        {
            _logger.LogError(exception,
                "Cloudinary cleanup for package image {PublicId} is pending. Retry after fixing Cloudinary configuration.",
                image.PublicId);
            throw;
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(exception,
                "Cloudinary cleanup for package image {PublicId} is pending. Retry by deleting image {PackageImageId}.",
                image.PublicId, image.PackageImageId);
            throw new PackageImageCleanupPendingException(
                "The image is no longer active but Cloudinary cleanup is pending. Retry deleting this image to complete cleanup.",
                exception);
        }

        _repository.RemoveImage(image);
        await _repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<(string Name, byte[] Content)> ValidateImageAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length <= 0 || file.Length > _imageOptions.MaxFileSizeBytes)
            throw new ArgumentException($"Image size must be between 1 byte and {_imageOptions.MaxFileSizeBytes} bytes.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var expectedContentType = extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => throw new ArgumentException("Only JPEG, PNG, and WebP images are supported.")
        };
        if (!string.Equals(file.ContentType, expectedContentType, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("The image extension and content type do not match.");

        await using var input = file.OpenReadStream();
        await using var buffer = new MemoryStream((int)file.Length);
        await input.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        var validSignature = extension switch
        {
            ".jpg" or ".jpeg" => bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF,
            ".png" => bytes.Length >= 8 && bytes.AsSpan(0, 8).SequenceEqual(
                new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            ".webp" => bytes.Length >= 12 &&
                bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8) &&
                bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8),
            _ => false
        };
        if (!validSignature) throw new ArgumentException("The uploaded file is not a valid supported image.");
        return (Path.GetFileName(file.FileName), bytes);
    }

    private async Task CleanupUploadedAsync(IEnumerable<StoredPackageImage> uploaded, CancellationToken cancellationToken)
    {
        foreach (var image in uploaded)
        {
            try
            {
                await _imageStorage.DeleteAsync(image.PublicId, CancellationToken.None);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                _logger.LogError(exception, "Could not clean up uploaded Cloudinary image {PublicId}.", image.PublicId);
            }
        }
    }

    private static void Apply(TravelPackage package, CreateTravelPackageRequestDto request)
    {
        package.PackageCode = request.PackageCode.Trim().ToUpperInvariant();
        package.PackageName = request.PackageName.Trim();
        package.Destination = request.Destination.Trim();
        package.Country = request.Country.Trim();
        package.PackageType = request.PackageType.Trim();
        package.DurationDays = request.DurationDays;
        package.DurationNights = request.DurationNights;
        package.Description = request.Description.Trim();
        package.BasePrice = request.BasePrice;
        package.AdultPrice = request.AdultPrice;
        package.ChildPrice = request.ChildPrice;
        package.InfantPrice = request.InfantPrice;
        package.Currency = request.Currency.Trim().ToUpperInvariant();
    }

    private static void ValidateDay(TravelPackage package, int dayNumber)
    {
        if (dayNumber < 1 || dayNumber > package.DurationDays)
            throw new ArgumentException("Itinerary day must be within the package duration.");
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static TravelPackageSummaryDto ToSummary(TravelPackage package) => new(
        package.TravelPackageId, package.PackageCode, package.PackageName, package.Destination, package.Country,
        package.PackageType, package.DurationDays, package.DurationNights, package.BasePrice, package.AdultPrice,
        package.ChildPrice, package.InfantPrice, package.Currency, package.CoverImageUrl, package.IsActive);

    private static TravelPackageDetailsDto ToDetails(TravelPackage package) => new(
        package.TravelPackageId, package.PackageCode, package.PackageName, package.Destination, package.Country,
        package.PackageType, package.DurationDays, package.DurationNights, package.Description, package.BasePrice,
        package.AdultPrice, package.ChildPrice, package.InfantPrice, package.Currency, package.CoverImageUrl, package.IsActive,
        package.CreatedAt, package.UpdatedAt, package.Itinerary.OrderBy(item => item.DayNumber).Select(ToResponse).ToArray(),
        package.Images.OrderBy(image => image.DisplayOrder).Select(ToResponse).ToArray(),
        package.Inclusions.Select(item => new PackageContentResponseDto(item.InclusionId, item.Description)).ToArray(),
        package.Exclusions.Select(item => new PackageContentResponseDto(item.ExclusionId, item.Description)).ToArray());

    private static PackageItineraryResponseDto ToResponse(PackageItinerary item) =>
        new(item.ItineraryId, item.DayNumber, item.Title, item.Description, item.Accommodation, item.MealsIncluded);

    private static PackageImageResponseDto ToResponse(PackageImage image) =>
        new(image.PackageImageId, image.ImageUrl, image.DisplayOrder, image.IsPrimary, image.CreatedAt, image.CleanupPending);
}
