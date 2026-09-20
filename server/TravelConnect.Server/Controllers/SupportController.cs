using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Controllers;

/// <summary>
/// Customer support chat — a lightweight helpdesk on top of the existing
/// inquiry pipeline. Customers open a conversation (bubble or Support page),
/// agents/admin see a shared inbox, can assign a thread to someone, reply, and
/// resolve. Threads use a tiny unread counter on each side so both inboxes get
/// badges without shipping the whole history on every poll.
/// </summary>
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class SupportController(TravelConnectDbContext db, EmailService emailService) : ControllerBase
{
    /* ── helpers ─────────────────────────────────────────────────── */

    private string CurrentUid() =>
        User.FindFirst("uid")?.Value ??
        User.FindFirst("user_id")?.Value ??
        User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ??
        string.Empty;

    private string CurrentEmail() =>
        User.FindFirst("email")?.Value ??
        User.FindFirst("preferred_username")?.Value ??
        string.Empty;

    // An agent is any logged-in SystemUser who is Active and not just a
    // bare "Customer" record (staff, agency staff, finance, supplier, etc.).
    private async Task<bool> IsAgentAsync()
    {
        if (string.IsNullOrWhiteSpace(CurrentUid())) return false;
        var su = await db.SystemUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.FirebaseUid == CurrentUid());
        return su is not null &&
               su.Status.Equals("Active", StringComparison.OrdinalIgnoreCase) &&
               !su.Role.Equals("Customer", StringComparison.OrdinalIgnoreCase);
    }

    /* ── customer side: my conversations + thread + send ─────────── */

    [HttpGet("conversations")]
    public async Task<ActionResult<IEnumerable<SupportConversation>>> MyConversations(string? email)
    {
        var customerEmail = ResolveCustomerEmail(email);
        return await db.SupportConversations
            .AsNoTracking()
            .Where(c => c.CustomerEmail.ToLower() == customerEmail.ToLower())
            .OrderByDescending(c => c.LastMessageAt)
            .ToListAsync();
    }

    [HttpGet("conversations/{id:int}")]
    public async Task<ActionResult<object>> GetThread(int id, string? email)
    {
        var customerEmail = ResolveCustomerEmail(email);
        var conv = await db.SupportConversations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.CustomerEmail.ToLower() == customerEmail.ToLower());
        if (conv is null) return NotFound(new { message = "Conversation not found" });

        await using var txn = await db.Database.BeginTransactionAsync();
        var messages = await db.SupportMessages
            .AsNoTracking()
            .Where(m => m.SupportConversationId == id)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();
        return Ok(new { conversation = conv, messages });
    }

    [HttpPost("conversations")]
    public async Task<ActionResult<SupportConversation>> CreateConversation(NewConversationRequest request)
    {
        var conv = new SupportConversation
        {
            CustomerEmail = Normalize(ResolveCustomerEmail(request.Email)),
            CustomerName = request.CustomerName?.Trim() ?? string.Empty,
            Subject = request.Subject?.Trim() ?? "General support",
            Category = request.Category ?? "General",
            Status = "Open",
            AssigneeEmail = string.Empty,
            UnreadByAgent = request.Body is null ? 0 : 1,
            UnreadByCustomer = 0,
            LastMessageAt = DateTime.UtcNow,
            LastMessagePreview = (request.Body ?? string.Empty).Length > 120
                ? request.Body![..120] + "…"
                : request.Body ?? string.Empty,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.SupportConversations.Add(conv);
        await db.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(request.Body))
        {
            db.SupportMessages.Add(new SupportMessage
            {
                SupportConversationId = conv.Id,
                SenderEmail = conv.CustomerEmail,
                SenderName = request.CustomerName?.Trim() ?? "Customer",
                SenderType = "Customer",
                Body = request.Body.Trim(),
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
        return CreatedAtAction(nameof(GetThread), new { id = conv.Id, email = conv.CustomerEmail }, conv);
    }

    [HttpPost("conversations/{id:int}/messages")]
    public async Task<ActionResult<SupportMessage>> SendMessage(int id, SendMessageRequest request)
    {
        var customerEmail = Normalize(ResolveCustomerEmail(request.SenderEmail));
        var conv = await db.SupportConversations
            .FirstOrDefaultAsync(c => c.Id == id && c.CustomerEmail.ToLower() == customerEmail.ToLower());
        if (conv is null) return NotFound(new { message = "Conversation not found" });

        var msg = new SupportMessage
        {
            SupportConversationId = conv.Id,
            SenderEmail = customerEmail,
            SenderName = request.SenderName ?? "Customer",
            SenderType = "Customer",
            Body = request.Body?.Trim() ?? string.Empty,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        conv.UnreadByAgent++;
        conv.UnreadByCustomer = 0;
        conv.LastMessageAt = DateTime.UtcNow;
        conv.LastMessagePreview = msg.Body.Length > 120 ? msg.Body[..120] + "…" : msg.Body;
        if (conv.Status == "Resolved") conv.Status = "Open";
        conv.UpdatedAt = DateTime.UtcNow;

        db.SupportMessages.Add(msg);
        await db.SaveChangesAsync();
        return Ok(msg);
    }

    /* ── agent / admin side: inbox + thread + reply + assign ─────── */

    // Marks a conversation as read on the customer side so the chat bubble
    // ping clears after the client opens the thread.
    [HttpPut("conversations/{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id, string? email)
    {
        var customerEmail = ResolveCustomerEmail(email);
        var conv = await db.SupportConversations
            .FirstOrDefaultAsync(c => c.Id == id && c.CustomerEmail.ToLower() == customerEmail.ToLower());
        if (conv is null) return NotFound(new { message = "Conversation not found" });
        conv.UnreadByCustomer = 0;
        conv.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("inbox")]
    public async Task<ActionResult<IEnumerable<SupportConversation>>> Inbox(string? status, string? assignee, string? category)
    {
        if (!await IsAgentAsync()) return Forbid();
        var query = db.SupportConversations.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            query = query.Where(c => c.Status == status);
        if (!string.IsNullOrWhiteSpace(assignee) && assignee != "All")
            query = query.Where(c => c.AssigneeEmail.ToLower() == assignee.ToLower());
        if (!string.IsNullOrWhiteSpace(category) && category != "All")
            query = query.Where(c =>
                (c.Category ?? string.Empty).ToLower() == category.ToLower());
        return await query.OrderByDescending(c => c.LastMessageAt).ToListAsync();
    }

    [HttpGet("inbox/{id:int}")]
    public async Task<ActionResult<object>> GetAgentThread(int id)
    {
        if (!await IsAgentAsync()) return Forbid();
        var conv = await db.SupportConversations.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (conv is null) return NotFound(new { message = "Conversation not found" });
        var messages = await db.SupportMessages
            .AsNoTracking()
            .Where(m => m.SupportConversationId == id)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();
        return Ok(new { conversation = conv, messages });
    }

    [HttpPut("inbox/{id:int}/read")]
    public async Task<IActionResult> ReadAsAgent(int id)
    {
        if (!await IsAgentAsync()) return Forbid();
        var conv = await db.SupportConversations.FirstOrDefaultAsync(c => c.Id == id);
        if (conv is null) return NotFound(new { message = "Conversation not found" });
        conv.UnreadByAgent = 0;
        conv.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Subscription-inquiry email history for the admin panel. Lists every
    // inbound "notice" (EmailJS → admin Gmail) and outbound "reply" (SMTP →
    // customer) so the Super Admin can audit what was emailed and when.
    [HttpGet("emails")]
    public async Task<ActionResult<IEnumerable<EmailLog>>> EmailHistory()
    {
        if (!await IsAgentAsync()) return Forbid();
        return await db.EmailLogs
            .AsNoTracking()
            .Where(e => e.Type == "subscription_inquiry_notice" ||
                        e.Type == "subscription_inquiry_reply")
            .OrderByDescending(e => e.SentAt)
            .ToListAsync();
    }

    [HttpPost("inbox/{id:int}/reply")]
    public async Task<ActionResult<SupportMessage>> ReplyAsAgent(int id, AgentReplyRequest request)
    {
        if (!await IsAgentAsync()) return Forbid();
        var conv = await db.SupportConversations.FirstOrDefaultAsync(c => c.Id == id);
        if (conv is null) return NotFound(new { message = "Conversation not found" });

        var agentEmail = CurrentEmail();
        var msg = new SupportMessage
        {
            SupportConversationId = conv.Id,
            SenderEmail = agentEmail,
            SenderName = request.AgentName ?? "Support Team",
            SenderType = "Agent",
            Body = request.Body?.Trim() ?? string.Empty,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        conv.UnreadByCustomer++;
        conv.UnreadByAgent = 0;
        conv.LastMessageAt = DateTime.UtcNow;
        conv.LastMessagePreview = msg.Body.Length > 120 ? msg.Body[..120] + "…" : msg.Body;
        conv.Status = "Replied";
        conv.UpdatedAt = DateTime.UtcNow;

        db.SupportMessages.Add(msg);
        await db.SaveChangesAsync();
        return Ok(msg);
    }

    // Replying by email ALSO sends a real email to the customer through SMTP,
    // keeps a copy in the chat thread, and logs the send in EmailLogs so the
    // admin Subscription page can show a full email history.
    [HttpPost("inbox/{id:int}/reply-email")]
    public async Task<ActionResult<object>> ReplyAsAgentByEmail(int id, AgentReplyRequest request)
    {
        if (!await IsAgentAsync()) return Forbid();
        var conv = await db.SupportConversations.FirstOrDefaultAsync(c => c.Id == id);
        if (conv is null) return NotFound(new { message = "Conversation not found" });

        var body = request.Body?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(body))
            return BadRequest(new { message = "Reply body is required." });
        if (string.IsNullOrWhiteSpace(conv.CustomerEmail))
            return BadRequest(new { message = "Customer has no email address to reply to." });

        var subject = $"Re: {conv.Subject}";
        var sent = await emailService.SendInquiryReplyAsync(
            conv.CustomerEmail, conv.CustomerName, subject, body);

        var agentEmail = CurrentEmail();
        var msg = new SupportMessage
        {
            SupportConversationId = conv.Id,
            SenderEmail = agentEmail,
            SenderName = request.AgentName ?? "Support Team",
            SenderType = "Agent",
            Body = body,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        conv.UnreadByCustomer++;
        conv.UnreadByAgent = 0;
        conv.LastMessageAt = DateTime.UtcNow;
        conv.LastMessagePreview = body.Length > 120 ? body[..120] + "…" : body;
        conv.Status = "Replied";
        conv.UpdatedAt = DateTime.UtcNow;

        db.SupportMessages.Add(msg);
        await db.SaveChangesAsync();
        return Ok(new { message = msg, sent, email = conv.CustomerEmail });
    }

    [HttpPut("inbox/{id:int}/assign")]
    public async Task<IActionResult> Assign(int id, AssignRequest request)
    {
        if (!await IsAgentAsync()) return Forbid();
        var conv = await db.SupportConversations.FirstOrDefaultAsync(c => c.Id == id);
        if (conv is null) return NotFound(new { message = "Conversation not found" });
        conv.AssigneeEmail = Normalize(request.AssigneeEmail ?? string.Empty);
        conv.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("inbox/{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, StatusRequest request)
    {
        if (!await IsAgentAsync()) return Forbid();
        var conv = await db.SupportConversations.FirstOrDefaultAsync(c => c.Id == id);
        if (conv is null) return NotFound(new { message = "Conversation not found" });
        conv.Status = request.Status ?? "Open";
        conv.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private string ResolveCustomerEmail(string? email) =>
        !string.IsNullOrWhiteSpace(email) ? email.Trim() : CurrentEmail();

    private static string Normalize(string? email) =>
        (email ?? string.Empty).Trim().ToLowerInvariant();
}

public class NewConversationRequest
{
    public string? Email { get; set; }
    public string? CustomerName { get; set; }
    public string? Subject { get; set; }
    public string? Category { get; set; } = "General";
    public string? Body { get; set; }
}

public class SendMessageRequest
{
    public string? SenderEmail { get; set; }
    public string? SenderName { get; set; }
    public string Body { get; set; } = string.Empty;
}

public class AgentReplyRequest
{
    public string? AgentName { get; set; }
    public string Body { get; set; } = string.Empty;
}

public class AssignRequest
{
    public string AssigneeEmail { get; set; } = string.Empty;
}

public class StatusRequest
{
    public string Status { get; set; } = "Open";
}
