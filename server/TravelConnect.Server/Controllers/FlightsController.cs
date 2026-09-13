using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class FlightsController(TravelConnectDbContext db) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<Flight>>> GetAll()
    {
        return await db.Flights
            .Include(f => f.Supplier)
            .AsNoTracking()
            .OrderByDescending(e => e.UpdatedAt)
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<Flight>> GetById(int id)
    {
        var entity = await db.Flights.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        return Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<Flight>> Create(Flight entity)
    {
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        db.Flights.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Flight entity)
    {
        if (id != entity.Id) return BadRequest(new { message = "ID mismatch" });
        var existing = await db.Flights.FirstOrDefaultAsync(e => e.Id == id);
        if (existing is null) return NotFound(new { message = "Record not found" });

        db.Entry(existing).CurrentValues.SetValues(entity);
        existing.UpdatedAt = DateTime.UtcNow;
        existing.CreatedAt = existing.CreatedAt switch
        {
            DateTime min when min == default => DateTime.UtcNow,
            _ => existing.CreatedAt
        };
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await db.Flights.FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        db.Flights.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }
}