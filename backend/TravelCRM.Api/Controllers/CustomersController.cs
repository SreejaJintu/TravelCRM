using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelCRM.Api.DTOs.Customers;
using TravelCRM.Api.Services;
using TravelCRM.Api.Services.Interfaces;

namespace TravelCRM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public sealed class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;

    public CustomersController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    /// <summary>Gets a paginated, optionally searched customer list.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResponseDto<CustomerResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponseDto<CustomerResponseDto>>> GetCustomers(
        [FromQuery, StringLength(150)] string? search = null,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "A valid user identity is required."));
        }

        var result = await _customerService.GetCustomersAsync(
            userId,
            User.IsInRole("Admin"),
            search,
            page,
            pageSize,
            cancellationToken);

        return Ok(result);
    }

    /// <summary>Gets one customer if the current user is allowed to access it.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(CustomerResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerResponseDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "A valid user identity is required."));
        }

        var customer = await _customerService.GetByIdAsync(
            id,
            userId,
            User.IsInRole("Admin"),
            cancellationToken);

        return customer is null
            ? NotFound(Problem(statusCode: StatusCodes.Status404NotFound, title: "Customer not found."))
            : Ok(customer);
    }

    /// <summary>Creates a customer owned by the authenticated user.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(CustomerResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerResponseDto>> Create(
        CreateCustomerRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "A valid user identity is required."));
        }

        var result = await _customerService.CreateAsync(userId, request, cancellationToken);
        if (result.Status == CustomerOperationStatus.EmailConflict)
        {
            return Conflict(Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Customer email is already in use."));
        }

        var customer = result.Value!;
        return CreatedAtAction(nameof(GetById), new { id = customer.CustomerId }, customer);
    }

    /// <summary>Updates customer details without changing its owner or status.</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(CustomerResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerResponseDto>> Update(
        int id,
        UpdateCustomerRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "A valid user identity is required."));
        }

        var result = await _customerService.UpdateAsync(
            id,
            userId,
            User.IsInRole("Admin"),
            request,
            cancellationToken);

        return result.Status switch
        {
            CustomerOperationStatus.NotFound => NotFound(Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Customer not found.")),
            CustomerOperationStatus.EmailConflict => Conflict(Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Customer email is already in use.")),
            _ => Ok(result.Value)
        };
    }

    /// <summary>Deactivates a customer without permanently deleting its record.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Deactivate(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "A valid user identity is required."));
        }

        var result = await _customerService.SetActiveAsync(
            id,
            userId,
            User.IsInRole("Admin"),
            false,
            cancellationToken);

        return result.Status == CustomerOperationStatus.NotFound
            ? NotFound(Problem(statusCode: StatusCodes.Status404NotFound, title: "Customer not found."))
            : NoContent();
    }

    /// <summary>Reactivates an inactive customer.</summary>
    [HttpPatch("{id:int}/activate")]
    [ProducesResponseType(typeof(CustomerResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerResponseDto>> Activate(
        int id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "A valid user identity is required."));
        }

        var result = await _customerService.SetActiveAsync(
            id,
            userId,
            User.IsInRole("Admin"),
            true,
            cancellationToken);

        return result.Status == CustomerOperationStatus.NotFound
            ? NotFound(Problem(statusCode: StatusCodes.Status404NotFound, title: "Customer not found."))
            : Ok(result.Value);
    }

    private bool TryGetUserId(out int userId)
    {
        return int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
    }
}