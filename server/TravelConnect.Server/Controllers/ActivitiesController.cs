using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ActivitiesController(TravelConnectDbContext db) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<Activity>>> GetAll()
    {
        return await db.Activities
            .Include(a => a.Supplier)
            .AsNoTracking()
            .OrderByDescending(e => e.UpdatedAt)
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<Activity>> GetById(int id)
    {
        var entity = await db.Activities.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        return Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<Activity>> Create(Activity entity)
    {
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        db.Activities.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Activity entity)
    {
        if (id != entity.Id) return BadRequest(new { message = "ID mismatch" });
        var existing = await db.Activities.FirstOrDefaultAsync(e => e.Id == id);
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
        var entity = await db.Activities.FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        db.Activities.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }
}