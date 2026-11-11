using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Services;

public sealed class PackageImageOptions
{
    public const string SectionName = "PackageImages";
    public long MaxFileSizeBytes { get; set; } = 5 * 1024 * 1024;
}

public sealed class CloudinaryOptions
{
    public const string SectionName = "Cloudinary";
    public string? CloudName { get; set; }
    public string? ApiKey { get; set; }
    public string? ApiSecret { get; set; }
}

public sealed class PackageImageStorage : IPackageImageStorage
{
    private readonly CloudinaryOptions _options;
    private Cloudinary? _cloudinary;

    public PackageImageStorage(
        IOptions<CloudinaryOptions> options)
    {
        _options = options.Value;
    }

    public async Task<StoredPackageImage> UploadAsync(
        Stream content,
        string fileName,
        string folder,
        CancellationToken cancellationToken)
    {
        ImageUploadResult result;
        try
        {
            result = await Client().UploadAsync(
                new ImageUploadParams
                {
                    File = new FileDescription(fileName, content),
                    Folder = folder,
                    UseFilename = false,
                    UniqueFilename = true,
                    Overwrite = false
                },
                cancellationToken);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (ImageStorageUnavailableException)
        {
            throw;
        }
        catch (Exception exception)
        {
            throw new ImageStorageUnavailableException("Image upload failed in Cloudinary.", exception);
        }

        if (result.Error is not null || result.SecureUrl is null || string.IsNullOrWhiteSpace(result.PublicId))
        {
            var message = result.Error?.Message ?? "Cloudinary did not return image metadata.";
            throw new ImageStorageUnavailableException($"Image upload failed: {message}");
        }

        return new StoredPackageImage(result.SecureUrl.ToString(), result.PublicId);
    }

    public async Task DeleteAsync(string publicId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        DeletionResult result;
        try
        {
            result = await Client().DestroyAsync(new DeletionParams(publicId));
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (ImageStorageUnavailableException)
        {
            throw;
        }
        catch (Exception exception)
        {
            throw new ImageStorageUnavailableException("Image deletion failed in Cloudinary.", exception);
        }

        if (result.Error is not null || result.Result is not ("ok" or "not found"))
        {
            var message = result.Error?.Message ?? $"Cloudinary deletion returned '{result.Result}'.";
            throw new ImageStorageUnavailableException($"Image cleanup failed: {message}");
        }
    }

    private Cloudinary Client()
    {
        if (_cloudinary is not null) return _cloudinary;
        if (string.IsNullOrWhiteSpace(_options.CloudName) ||
            string.IsNullOrWhiteSpace(_options.ApiKey) ||
            string.IsNullOrWhiteSpace(_options.ApiSecret))
        {
            throw new ImageStorageUnavailableException(
                "Cloudinary is not configured. Set Cloudinary__CloudName, Cloudinary__ApiKey, and Cloudinary__ApiSecret.");
        }

        var account = new Account(_options.CloudName, _options.ApiKey, _options.ApiSecret);
        _cloudinary = new Cloudinary(account);
        return _cloudinary;
    }
}
