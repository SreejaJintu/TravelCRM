using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelCRM.Api.DTOs.Packages;
using TravelCRM.Api.Services;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public sealed class TravelPackagesController : ControllerBase
{
    private readonly ITravelPackageService _service;

    public TravelPackagesController(ITravelPackageService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedTravelPackagesResponseDto<TravelPackageSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedTravelPackagesResponseDto<TravelPackageSummaryDto>>> GetPackages(
        [FromQuery, StringLength(150)] string? search = null,
        [FromQuery, StringLength(50)] string? packageType = null,
        [FromQuery, Range(1, 365)] int? minDurationDays = null,
        [FromQuery, Range(1, 365)] int? maxDurationDays = null,
        [FromQuery, Range(typeof(decimal), "0", "9999999999999999.99")] decimal? minPrice = null,
        [FromQuery, Range(typeof(decimal), "0", "9999999999999999.99")] decimal? maxPrice = null,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 12,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _service.GetPagedAsync(
                search, packageType, minDurationDays, maxDurationDays, minPrice, maxPrice,
                !User.IsInRole("Admin"), page, pageSize, cancellationToken));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(Problem(statusCode: StatusCodes.Status400BadRequest, title: exception.Message));
        }
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(TravelPackageDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TravelPackageDetailsDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var package = await _service.GetByIdAsync(id, User.IsInRole("Admin"), cancellationToken);
        return package is null ? NotFound(PackageNotFound()) : Ok(package);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(TravelPackageDetailsDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TravelPackageDetailsDto>> Create(
        CreateTravelPackageRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return InvalidUser();
        try
        {
            var package = await _service.CreateAsync(userId, request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = package.TravelPackageId }, package);
        }
        catch (PackageConflictException exception)
        {
            return Conflict(Problem(statusCode: StatusCodes.Status409Conflict, title: exception.Message));
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(TravelPackageDetailsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<TravelPackageDetailsDto>> Update(
        int id, UpdateTravelPackageRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var package = await _service.UpdateAsync(id, request, cancellationToken);
            return package is null ? NotFound(PackageNotFound()) : Ok(package);
        }
        catch (PackageConflictException exception)
        {
            return Conflict(Problem(statusCode: StatusCodes.Status409Conflict, title: exception.Message));
        }
    }

    [HttpPatch("{id:int}/activation")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetActive(int id, [FromQuery] bool active, CancellationToken cancellationToken)
    {
        var result = await _service.SetActiveAsync(id, active, cancellationToken);
        return result is null ? NotFound(PackageNotFound()) : NoContent();
    }

    [HttpGet("{id:int}/itinerary")]
    public async Task<ActionResult<IReadOnlyList<PackageItineraryResponseDto>>> GetItinerary(
        int id, CancellationToken cancellationToken)
    {
        var package = await _service.GetByIdAsync(id, User.IsInRole("Admin"), cancellationToken);
        return package is null ? NotFound(PackageNotFound()) : Ok(package.Itinerary);
    }

    [HttpPost("{id:int}/itinerary")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PackageItineraryResponseDto>> AddItinerary(
        int id, CreateItineraryRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.AddItineraryAsync(id, request, cancellationToken);
            return item is null
                ? NotFound(PackageNotFound())
                : CreatedAtAction(nameof(GetItinerary), new { id }, item);
        }
        catch (PackageConflictException exception)
        {
            return Conflict(Problem(statusCode: StatusCodes.Status409Conflict, title: exception.Message));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(Problem(statusCode: StatusCodes.Status400BadRequest, title: exception.Message));
        }
    }

    [HttpPut("{id:int}/itinerary/{itineraryId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PackageItineraryResponseDto>> UpdateItinerary(
        int id, int itineraryId, UpdateItineraryRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.UpdateItineraryAsync(id, itineraryId, request, cancellationToken);
            return item is null ? NotFound(PackageNotFound()) : Ok(item);
        }
        catch (PackageConflictException exception)
        {
            return Conflict(Problem(statusCode: StatusCodes.Status409Conflict, title: exception.Message));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(Problem(statusCode: StatusCodes.Status400BadRequest, title: exception.Message));
        }
    }

    [HttpDelete("{id:int}/itinerary/{itineraryId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteItinerary(int id, int itineraryId, CancellationToken cancellationToken) =>
        await _service.DeleteItineraryAsync(id, itineraryId, cancellationToken) ? NoContent() : NotFound(PackageNotFound());

    [HttpGet("{id:int}/inclusions")]
    public async Task<ActionResult<string[]>> GetInclusions(int id, CancellationToken cancellationToken)
    {
        var package = await _service.GetByIdAsync(id, User.IsInRole("Admin"), cancellationToken);
        return package is null ? NotFound(PackageNotFound()) : Ok(package.Inclusions.Select(item => item.Description));
    }

    [HttpPost("{id:int}/inclusions")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddInclusion(int id, PackageDescriptionRequestDto request, CancellationToken cancellationToken)
    {
        var newId = await _service.AddInclusionAsync(id, request, cancellationToken);
        return newId is null ? NotFound(PackageNotFound()) : StatusCode(StatusCodes.Status201Created, new { inclusionId = newId });
    }

    [HttpPut("{id:int}/inclusions/{inclusionId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateInclusion(int id, int inclusionId, PackageDescriptionRequestDto request, CancellationToken cancellationToken) =>
        await _service.UpdateInclusionAsync(id, inclusionId, request, cancellationToken) ? NoContent() : NotFound(PackageNotFound());

    [HttpDelete("{id:int}/inclusions/{inclusionId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteInclusion(int id, int inclusionId, CancellationToken cancellationToken) =>
        await _service.DeleteInclusionAsync(id, inclusionId, cancellationToken) ? NoContent() : NotFound(PackageNotFound());

    [HttpGet("{id:int}/exclusions")]
    public async Task<ActionResult<string[]>> GetExclusions(int id, CancellationToken cancellationToken)
    {
        var package = await _service.GetByIdAsync(id, User.IsInRole("Admin"), cancellationToken);
        return package is null ? NotFound(PackageNotFound()) : Ok(package.Exclusions.Select(item => item.Description));
    }

    [HttpPost("{id:int}/exclusions")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddExclusion(int id, PackageDescriptionRequestDto request, CancellationToken cancellationToken)
    {
        var newId = await _service.AddExclusionAsync(id, request, cancellationToken);
        return newId is null ? NotFound(PackageNotFound()) : StatusCode(StatusCodes.Status201Created, new { exclusionId = newId });
    }

    [HttpPut("{id:int}/exclusions/{exclusionId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateExclusion(int id, int exclusionId, PackageDescriptionRequestDto request, CancellationToken cancellationToken) =>
        await _service.UpdateExclusionAsync(id, exclusionId, request, cancellationToken) ? NoContent() : NotFound(PackageNotFound());

    [HttpDelete("{id:int}/exclusions/{exclusionId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteExclusion(int id, int exclusionId, CancellationToken cancellationToken) =>
        await _service.DeleteExclusionAsync(id, exclusionId, cancellationToken) ? NoContent() : NotFound(PackageNotFound());

    [HttpGet("{id:int}/images")]
    public async Task<ActionResult<IReadOnlyList<PackageImageResponseDto>>> GetImages(int id, CancellationToken cancellationToken)
    {
        var package = await _service.GetByIdAsync(id, User.IsInRole("Admin"), cancellationToken);
        return package is null ? NotFound(PackageNotFound()) : Ok(package.Images);
    }

    [HttpPost("{id:int}/images")]
    [Authorize(Roles = "Admin")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(55_000_000)]
    [ProducesResponseType(typeof(IReadOnlyList<PackageImageResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadImages(
        int id, List<IFormFile> files, CancellationToken cancellationToken)
    {
        try
        {
            var images = await _service.UploadImagesAsync(id, files, cancellationToken);
            return images is null ? NotFound(PackageNotFound()) : Ok(images);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(Problem(statusCode: StatusCodes.Status400BadRequest, title: exception.Message));
        }
        catch (ImageStorageUnavailableException exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: exception.Message));
        }
    }

    [HttpPatch("{id:int}/images/{imageId:int}/primary")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PackageImageResponseDto>> SetPrimaryImage(
        int id, int imageId, CancellationToken cancellationToken)
    {
        var image = await _service.SetPrimaryImageAsync(id, imageId, cancellationToken);
        return image is null ? NotFound(PackageNotFound()) : Ok(image);
    }

    [HttpPut("{id:int}/images/order")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateImageOrder(
        int id, UpdateImageOrderRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            return await _service.UpdateImageOrderAsync(id, request, cancellationToken)
                ? NoContent()
                : NotFound(PackageNotFound());
        }
        catch (ArgumentException exception)
        {
            return BadRequest(Problem(statusCode: StatusCodes.Status400BadRequest, title: exception.Message));
        }
    }

    [HttpPut("{id:int}/images/{imageId:int}/replace")]
    [Authorize(Roles = "Admin")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(55_000_000)]
    public async Task<IActionResult> ReplaceImage(
        int id, int imageId, IFormFile file, CancellationToken cancellationToken)
    {
        try
        {
            var image = await _service.ReplaceImageAsync(id, imageId, file, cancellationToken);
            return image is null ? NotFound(PackageNotFound()) : Ok(image);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(Problem(statusCode: StatusCodes.Status400BadRequest, title: exception.Message));
        }
        catch (ImageStorageUnavailableException exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: exception.Message));
        }
    }

    [HttpDelete("{id:int}/images/{imageId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteImage(int id, int imageId, CancellationToken cancellationToken)
    {
        try
        {
            return await _service.DeleteImageAsync(id, imageId, cancellationToken)
                ? NoContent()
                : NotFound(PackageNotFound());
        }
        catch (PackageImageCleanupPendingException exception)
        {
            return StatusCode(StatusCodes.Status502BadGateway,
                Problem(statusCode: StatusCodes.Status502BadGateway, title: exception.Message));
        }
        catch (ImageStorageUnavailableException exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: exception.Message));
        }
    }

    private bool TryGetUserId(out int userId) =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    private UnauthorizedObjectResult InvalidUser() =>
        Unauthorized(Problem(statusCode: StatusCodes.Status401Unauthorized, title: "A valid user identity is required."));

    private NotFoundObjectResult PackageNotFound() =>
        NotFound(Problem(statusCode: StatusCodes.Status404NotFound, title: "Travel package not found."));
}
