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
public class InquiriesController(TravelConnectDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Inquiry>>> GetAll()
    {
        return await db.Inquiries
            .AsNoTracking()
            .OrderByDescending(e => e.UpdatedAt)
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Inquiry>> GetById(int id)
    {
        var entity = await db.Inquiries.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        return Ok(entity);
    }

    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting("anonymous-write")]
    public async Task<ActionResult<Inquiry>> Create(Inquiry entity)
    {
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        db.Inquiries.Add(entity);

        // Pipeline: every public/checkout inquiry automatically becomes a CRM
        // lead (New stage) so nothing falls through the cracks. De-duplicated by
        // email so repeat inquirers keep a single lead record.
        if (!string.IsNullOrWhiteSpace(entity.CustomerEmail))
        {
            var email = entity.CustomerEmail.Trim().ToLowerInvariant();
            var existing = await db.Leads
                .FirstOrDefaultAsync(l => l.Email.ToLower() == email);

            if (existing is not null)
            {
                existing.LastContact = DateTime.UtcNow.ToString("yyyy-MM-dd");
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                db.Leads.Add(new Lead
                {
                    Name = entity.CustomerName ?? string.Empty,
                    Email = email,
                    Phone = string.Empty,
                    Interest = entity.Subject ?? entity.Category ?? string.Empty,
                    Stage = "New",
                    Source = "Website",
                    LastContact = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    Notes = $"Created automatically from inquiry: {entity.Message}",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Inquiry entity)
    {
        if (id != entity.Id) return BadRequest(new { message = "ID mismatch" });
        var existing = await db.Inquiries.FirstOrDefaultAsync(e => e.Id == id);
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
        var entity = await db.Inquiries.FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        db.Inquiries.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }
}