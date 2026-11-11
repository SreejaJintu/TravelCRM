namespace TravelCRM.Api.Services.Interfaces;

public sealed record StoredPackageImage(string ImageUrl, string PublicId);

public interface IPackageImageStorage
{
    Task<StoredPackageImage> UploadAsync(
        Stream content,
        string fileName,
        string folder,
        CancellationToken cancellationToken);

    Task DeleteAsync(string publicId, CancellationToken cancellationToken);
}
