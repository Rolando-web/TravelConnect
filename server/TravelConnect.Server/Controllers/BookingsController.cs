using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController(TravelConnectDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Booking>>> GetAll(string? status = null, string? customer = null)
    {
        IQueryable<Booking> query = db.Bookings.AsNoTracking().OrderByDescending(b => b.CreatedAt);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(b => b.Status == status);
        if (!string.IsNullOrWhiteSpace(customer))
        {
            var c = customer.ToLower();
            query = query.Where(b =>
                b.CustomerName.ToLower().Contains(c) ||
                b.CustomerEmail.ToLower().Contains(c));
        }
        return await query.ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Booking>> GetById(int id)
    {
        var booking = await db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id);
        if (booking is null) return NotFound(new { message = "Booking not found" });
        return Ok(booking);
    }

    [HttpGet("reference/{reference}")]
    public async Task<ActionResult<Booking>> GetByReference(string reference)
    {
        var booking = await db.Bookings
            .Where(b => b.ReferenceNumber == reference)
            .FirstOrDefaultAsync();
        if (booking is null) return NotFound(new { message = "Booking not found" });
        return Ok(booking);
    }

    [HttpGet("customer/{email}")]
    public async Task<ActionResult<IEnumerable<Booking>>> GetByCustomer(string email)
    {
        return await db.Bookings
            .Where(b => b.CustomerEmail.ToLower() == email.ToLower())
            .AsNoTracking()
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Booking>> Create(Booking booking)
    {
        booking.CreatedAt = DateTime.UtcNow;
        booking.UpdatedAt = DateTime.UtcNow;
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = booking.Id }, booking);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Booking booking)
    {
        if (id != booking.Id) return BadRequest(new { message = "ID mismatch" });
        var existing = await db.Bookings.FirstOrDefaultAsync(b => b.Id == id);
        if (existing is null) return NotFound(new { message = "Booking not found" });

        db.Entry(existing).CurrentValues.SetValues(booking);
        existing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == id);
        if (booking is null) return NotFound(new { message = "Booking not found" });
        db.Bookings.Remove(booking);
        await db.SaveChangesAsync();
        return NoContent();
    }
}