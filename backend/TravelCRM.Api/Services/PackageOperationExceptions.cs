namespace TravelCRM.Api.Services;

public sealed class PackageConflictException(string message) : Exception(message);

public sealed class ImageStorageUnavailableException(string message, Exception? innerException = null)
    : Exception(message, innerException);

public sealed class PackageImageCleanupPendingException(string message, Exception? innerException = null)
    : Exception(message, innerException);
