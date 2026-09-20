using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class InquiriesController(TravelConnectDbContext db, EmailJsService emailJs) : ControllerBase
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

        // Every inquiry also mirrors into the customer support inbox so it
        // (a) shows up as a new message for the matching admin panel (e.g.
        // the Subscription page filters Category == "Subscription") and
        // (b) is instantly visible + reply-able from the client-side chat
        // widget (conversations are matched by the customer email).
        if (!string.IsNullOrWhiteSpace(entity.CustomerEmail))
        {
            var customerEmail = entity.CustomerEmail.Trim().ToLowerInvariant();
            var thread = new SupportConversation
            {
                CustomerEmail = customerEmail,
                CustomerName = entity.CustomerName?.Trim() ?? string.Empty,
                Subject = string.IsNullOrWhiteSpace(entity.Subject)
                    ? "General support"
                    : entity.Subject.Trim(),
                Category = string.IsNullOrWhiteSpace(entity.Category)
                    ? "General"
                    : entity.Category.Trim(),
                Status = "Open",
                AssigneeEmail = string.Empty,
                UnreadByAgent = 1,
                UnreadByCustomer = 0,
                LastMessageAt = DateTime.UtcNow,
                LastMessagePreview = (entity.Message ?? string.Empty).Length > 120
                    ? entity.Message![..120] + "…"
                    : entity.Message ?? string.Empty,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.SupportConversations.Add(thread);
            await db.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(entity.Message))
            {
                db.SupportMessages.Add(new SupportMessage
                {
                    SupportConversationId = thread.Id,
                    SenderEmail = customerEmail,
                    SenderName = entity.CustomerName?.Trim() ?? "Customer",
                    SenderType = "Customer",
                    Body = entity.Message.Trim(),
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
                await db.SaveChangesAsync();
            }
        }

        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
    }

    // POST api/inquiries/notify — sends the admin notification email for a
    // tier inquiry. This replaces the browser-fired EmailJS call so the email
    // path is behind the same "anonymous-write" IP rate limiter as the inquiry
    // itself (10 requests/min/IP) instead of being spammable directly.
    [HttpPost("notify")]
    [AllowAnonymous]
    [EnableRateLimiting("anonymous-write")]
    public async Task<ActionResult> SendNotification(InquiryNotifyRequest request)
    {
        var name = (request.Name ?? string.Empty).Trim();
        var email = (request.Email ?? string.Empty).Trim();
        var message = (request.Message ?? string.Empty).Trim();
        var time = (request.Time ?? string.Empty).Trim();
        var tier = (request.Tier ?? string.Empty).Trim();
        var planName = (request.PlanName ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(name) || name.Length > 120)
            return BadRequest(new { message = "A valid name is required." });
        if (string.IsNullOrWhiteSpace(email) || email.Length > 254 ||
            !email.Contains('@') || email.StartsWith('@') || email.EndsWith('@'))
        {
            return BadRequest(new { message = "A valid email address is required." });
        }
        if (message.Length > 2000)
            return BadRequest(new { message = "Message is too long." });

        var sent = await emailJs.SendInquiryNotificationAsync(
            name, email,
            string.IsNullOrWhiteSpace(time) ? DateTime.Now.ToString("MMM d, yyyy, h:mm tt") : time,
            string.IsNullOrWhiteSpace(message) ? "Interested in this plan." : message,
            string.IsNullOrWhiteSpace(tier) ? "General" : tier,
            string.IsNullOrWhiteSpace(planName) ? "TravelConnect plan" : planName);

        // Record the inbound notification in the email history so the admin
        // Subscription page can show every email that was sent for it.
        try
        {
            db.EmailLogs.Add(new EmailLog
            {
                RecipientEmail = email,
                Subject = $"{tier} — {planName} subscription inquiry",
                Type = "subscription_inquiry_notice",
                Status = sent ? "Sent" : "Failed",
                ErrorMessage = sent ? "" : "EmailJS notification could not be sent",
                SentAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
        catch
        {
            /* history logging must never break the response */
        }

        return Ok(new
        {
            sent,
            message = sent
                ? "Notification sent."
                : "Notification could not be sent right now, but the inquiry was still recorded."
        });
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

public class InquiryNotifyRequest
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Time { get; set; }
    public string? Message { get; set; }
    public string? Tier { get; set; }
    public string? PlanName { get; set; }
}