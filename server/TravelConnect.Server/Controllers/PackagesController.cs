using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class PackagesController(TravelConnectDbContext db) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<Package>>> GetAll()
    {
        return await db.Packages
            .Include(p => p.Supplier)
            .AsNoTracking()
            .OrderByDescending(e => e.UpdatedAt)
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<Package>> GetById(int id)
    {
        var entity = await db.Packages.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        return Ok(entity);
    }

    [HttpGet("featured/{count:int}")]
    [AllowAnonymous]
    [ResponseCache(Duration = 120, Location = ResponseCacheLocation.Any, NoStore = false)]
    public async Task<ActionResult<IEnumerable<Package>>> GetFeatured(int count = 6)
    {
        return await db.Packages
            .Where(p => p.Status == "Active")
            .OrderByDescending(p => p.Rating)
            .Take(count)
            .AsNoTracking()
            .ToListAsync();
    }

    [HttpGet("location/{location}")]
    [AllowAnonymous]
    [EnableRateLimiting("public-read")]
    public async Task<ActionResult<IEnumerable<Package>>> GetByLocation(string location)
    {
        return await db.Packages
            .Where(p => p.Location.ToLower().Contains(location.ToLower()))
            .AsNoTracking()
            .Take(200)
            .ToListAsync();
    }

    [HttpGet("tag/{tag}")]
    [AllowAnonymous]
    [EnableRateLimiting("public-read")]
    public async Task<ActionResult<IEnumerable<Package>>> GetByTag(string tag)
    {
        return await db.Packages
            .Where(p => p.Tag == tag)
            .AsNoTracking()
            .Take(200)
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Package>> Create(Package entity)
    {
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        db.Packages.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Package entity)
    {
        if (id != entity.Id) return BadRequest(new { message = "ID mismatch" });
        var existing = await db.Packages.FirstOrDefaultAsync(e => e.Id == id);
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
        var entity = await db.Packages.FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        db.Packages.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }
}