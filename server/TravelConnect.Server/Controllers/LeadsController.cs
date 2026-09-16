using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class LeadsController(TravelConnectDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Lead>>> GetAll()
    {
        return await db.Leads
            .AsNoTracking()
            .OrderByDescending(e => e.UpdatedAt)
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Lead>> GetById(int id)
    {
        var entity = await db.Leads.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        return Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<Lead>> Create(Lead entity)
    {
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        if (string.IsNullOrWhiteSpace(entity.Source)) entity.Source = "Manual";
        if (string.IsNullOrWhiteSpace(entity.Stage)) entity.Stage = "New";
        db.Leads.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Lead entity)
    {
        if (id != entity.Id) return BadRequest(new { message = "ID mismatch" });
        var existing = await db.Leads.FirstOrDefaultAsync(e => e.Id == id);
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
        var entity = await db.Leads.FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        db.Leads.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // POST api/leads/{id}/stage — quick pipeline move (advance / mark lost /
    // reopen). Keeps LastContact fresh like a real CRM sales rep workflow.
    [HttpPost("{id:int}/stage")]
    public async Task<IActionResult> SetStage(int id, [FromBody] StageRequest request)
    {
        var entity = await db.Leads.FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        if (string.IsNullOrWhiteSpace(request?.Stage))
            return BadRequest(new { message = "Stage is required." });

        entity.Stage = request.Stage;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.LastContact = DateTime.UtcNow.ToString("yyyy-MM-dd");
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    // POST api/leads/{id}/convert — promote a lead to a paid-account customer.
    // Creates a Customer record (or updates the existing one by email) and
    // marks the lead "Closed Won". Idempotent: converting twice simply updates
    // the same customer.
    [HttpPost("{id:int}/convert")]
    public async Task<IActionResult> ConvertToCustomer(int id)
    {
        var lead = await db.Leads.FirstOrDefaultAsync(e => e.Id == id);
        if (lead is null) return NotFound(new { message = "Lead not found" });
        if (string.IsNullOrWhiteSpace(lead.Email))
            return BadRequest(new { message = "Lead has no email to link a customer record." });

        var email = lead.Email.Trim().ToLowerInvariant();
        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.Email.ToLower() == email);

        if (customer is null)
        {
            customer = new Customer
            {
                Name = lead.Name,
                Email = lead.Email.Trim(),
                Phone = lead.Phone,
                Country = string.Empty,
                TotalBookings = 0,
                TotalSpent = 0,
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Customers.Add(customer);
        }
        else
        {
            if (string.IsNullOrWhiteSpace(customer.Name)) customer.Name = lead.Name;
            if (string.IsNullOrWhiteSpace(customer.Phone)) customer.Phone = lead.Phone;
            customer.UpdatedAt = DateTime.UtcNow;
        }

        lead.Stage = "Won";
        lead.LastContact = DateTime.UtcNow.ToString("yyyy-MM-dd");
        lead.NextFollowUp = string.Empty;
        lead.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            customerId = customer.Id,
            message = $"Lead {lead.Name} converted to customer"
        });
    }
}

public class StageRequest
{
    public string Stage { get; set; } = string.Empty;
}