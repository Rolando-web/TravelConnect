using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class PromotionsController(
    TravelConnectDbContext db,
    PromoService promoService) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<Promotion>>> GetAll()
    {
        return await db.Promotions
            .AsNoTracking()
            .OrderByDescending(e => e.UpdatedAt)
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<Promotion>> GetById(int id)
    {
        var entity = await db.Promotions.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        return Ok(entity);
    }

    [HttpGet("code/{code}")]
    [AllowAnonymous]
    public async Task<ActionResult<Promotion>> GetByCode(string code)
    {
        var promo = await promoService.ValidateAsync(code, 0m);
        if (!promo.IsValid)
            return BadRequest(new { message = promo.Error ?? "Invalid promo code" });
        return Ok(promo.Promo);
    }

    [HttpPost]
    public async Task<ActionResult<Promotion>> Create(Promotion entity)
    {
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        db.Promotions.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Promotion entity)
    {
        if (id != entity.Id) return BadRequest(new { message = "ID mismatch" });
        var existing = await db.Promotions.FirstOrDefaultAsync(e => e.Id == id);
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
        var entity = await db.Promotions.FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        db.Promotions.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }
}