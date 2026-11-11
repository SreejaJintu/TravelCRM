
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelCRM.Api.Data;

namespace TravelCRM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DatabaseTestController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DatabaseTestController> _logger;

    public DatabaseTestController(
        ApplicationDbContext context,
        ILogger<DatabaseTestController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> TestConnection()
    {
        try
        {
            var canConnect = await _context.Database.CanConnectAsync();

            if (canConnect)
            {
                return Ok(new
                {
                    message = "Connected to CRMproject database successfully!"
                });
            }

            return StatusCode(500, new
            {
                message = "SQL Server connection failed. Check the connection string and database."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database connection test failed.");

            return StatusCode(500, new
            {
                message = "Database connection failed.",
                error = ex.GetBaseException().Message
            });
        }
    }
}
