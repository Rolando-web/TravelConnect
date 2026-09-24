using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
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
        User.FindFirst(ClaimTypes.Email)?.Value ??
        User.FindFirst("preferred_username")?.Value ??
        string.Empty;

    // Support is split by responsibility:
    //   • Tier / subscription inquiries  → Super Admin only (platform operator)
    //   • Refunds & general customer problems → Agency Admin only (agency owner)
    // So each inbox is only reachable by the team meant to handle it, and the
    // Super Admin has no authority over an agency's customer problems.

    private async Task<SystemUser?> CurrentSystemUserAsync()
    {
        var uid = CurrentUid();

        // Fast path: already linked by the Firebase UID.
        if (!string.IsNullOrWhiteSpace(uid))
        {
            var byUid = await db.SystemUsers
                .FirstOrDefaultAsync(u => u.FirebaseUid == uid);
            if (byUid is not null) return byUid;
        }

        // Fallback: link by the verified Firebase token email so seeded
        // accounts (FirebaseUid == "") work immediately, then persist the UID
        // so later requests take the fast path.
        var email = CurrentEmail();
        if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(uid))
        {
            var byEmail = await db.SystemUsers
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
            if (byEmail is not null)
            {
                if (!string.Equals(byEmail.FirebaseUid, uid, StringComparison.Ordinal))
                {
                    byEmail.FirebaseUid = uid;
                    byEmail.UpdatedAt = DateTime.UtcNow;
                    await db.SaveChangesAsync();
                }
                return byEmail;
            }
        }

        return null;
    }

    private async Task<bool> IsSuperAdminAsync()
    {
        var su = await CurrentSystemUserAsync();
        return su is not null &&
               su.Status.Equals("Active", StringComparison.OrdinalIgnoreCase) &&
               su.Role == "Super Admin";
    }

    private async Task<bool> IsAgencyAdminAsync()
    {
        var su = await CurrentSystemUserAsync();
        return su is not null &&
               su.Status.Equals("Active", StringComparison.OrdinalIgnoreCase) &&
               su.Role == "Agency Admin";
    }

    private static bool IsTierConversation(string? category) =>
        string.Equals(category, "Subscription", StringComparison.OrdinalIgnoreCase);

    // Only the role responsible for a conversation's category may read or act
    // on it. Returns false (and the caller returns Forbid) when the caller is
    // the wrong team. The Super Admin cannot moderate (or even read) an
    // agency's customer problems.
    private static bool CanModerate(string? category, bool isSuper, bool isAgencyAdmin) =>
        IsTierConversation(category) ? isSuper : isAgencyAdmin;

    /* ── customer side: my conversations + thread + send ─────────── */

    [HttpGet("conversations")]
    public async Task<ActionResult<IEnumerable<SupportConversation>>> MyConversations(string? email, DateTime? since = null)
    {
        var customerEmail = ResolveCustomerEmail(email);
        var query = db.SupportConversations
            .AsNoTracking()
            .Where(c => c.CustomerEmail.ToLower() == customerEmail.ToLower());
        if (since.HasValue)
            query = query.Where(c => c.LastMessageAt > since.Value.ToUniversalTime());
        return await query
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
    public async Task<ActionResult<IEnumerable<SupportConversation>>> Inbox(string? status = null, string? assignee = null, string? category = null, int? page = null, int? pageSize = null)
    {
        var super = await IsSuperAdminAsync();
        var admin = await IsAgencyAdminAsync();
        var tierView = IsTierConversation(category);
        if (tierView ? !super : !admin) return Forbid();
        var query = db.SupportConversations.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            query = query.Where(c => c.Status == status);
        if (!string.IsNullOrWhiteSpace(assignee) && assignee != "All")
            query = query.Where(c => c.AssigneeEmail.ToLower() == assignee.ToLower());
        if (string.IsNullOrWhiteSpace(category) || category == "All")
        {
            // No explicit category = the role's own scoped view. Agency Admin
            // must not see tier (Subscription) conversations they cannot
            // moderate — those belong to the Super Admin's inbox only.
            query = query.Where(c => !IsTierConversation(c.Category));
        }
        else
        {
            query = query.Where(c =>
                (c.Category ?? string.Empty).ToLower() == category.ToLower());
        }
        var ps = Math.Clamp(pageSize ?? 200, 1, 500);
        query = query.OrderByDescending(c => c.LastMessageAt);
        if (page is > 0)
            query = query.Skip((page.Value - 1) * ps);
        return await query.Take(ps).ToListAsync();
    }

    [HttpGet("inbox/{id:int}")]
    public async Task<ActionResult<object>> GetAgentThread(int id)
    {
        var conv = await db.SupportConversations.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (conv is null) return NotFound(new { message = "Conversation not found" });
        var super = await IsSuperAdminAsync();
        var admin = await IsAgencyAdminAsync();
        if (!CanModerate(conv.Category, super, admin)) return Forbid();
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
        var conv = await db.SupportConversations.FirstOrDefaultAsync(c => c.Id == id);
        if (conv is null) return NotFound(new { message = "Conversation not found" });
        var super = await IsSuperAdminAsync();
        var admin = await IsAgencyAdminAsync();
        if (!CanModerate(conv.Category, super, admin)) return Forbid();
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
        if (!await IsSuperAdminAsync()) return Forbid();
        return await db.EmailLogs
            .AsNoTracking()
            .Where(e => e.Type == "subscription_inquiry_notice" ||
                        e.Type == "subscription_inquiry_reply")
            .OrderByDescending(e => e.SentAt)
            .Take(200)
            .ToListAsync();
    }

    // Assignable support agents for the helpdesk "assign to" dropdown.
    // Both Super Admin and Agency Admin can load the roster; only active
    // users in either role appear so tickets are never handed to someone
    // who is disabled or not on the support team.
    [HttpGet("agents")]
    public async Task<ActionResult<IEnumerable<object>>> Agents()
    {
        var super = await IsSuperAdminAsync();
        var admin = await IsAgencyAdminAsync();
        if (!super && !admin) return Forbid();

        return await db.SystemUsers
            .AsNoTracking()
            .Where(u => u.Status.ToLower() == "active" &&
                        (u.Role == "Super Admin" || u.Role == "Agency Admin"))
            .OrderBy(u => u.DisplayName)
            .Select(u => new { u.Id, name = u.DisplayName, email = u.Email, role = u.Role })
            .ToListAsync();
    }

    [HttpPost("inbox/{id:int}/reply")]
    public async Task<ActionResult<SupportMessage>> ReplyAsAgent(int id, AgentReplyRequest request)
    {
        var conv = await db.SupportConversations.FirstOrDefaultAsync(c => c.Id == id);
        if (conv is null) return NotFound(new { message = "Conversation not found" });
        var super = await IsSuperAdminAsync();
        var admin = await IsAgencyAdminAsync();
        if (!CanModerate(conv.Category, super, admin)) return Forbid();

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

        await db.SaveChangesAsync();
        return Ok(msg);
    }

    // Replying by email ALSO sends a real email to the customer through SMTP,
    // keeps a copy in the chat thread, and logs the send in EmailLogs so the
    // admin Subscription page can show a full email history.
    [HttpPost("inbox/{id:int}/reply-email")]
    public async Task<ActionResult<object>> ReplyAsAgentByEmail(int id, AgentReplyRequest request)
    {
        var conv = await db.SupportConversations.FirstOrDefaultAsync(c => c.Id == id);
        if (conv is null) return NotFound(new { message = "Conversation not found" });
        var super = await IsSuperAdminAsync();
        var admin = await IsAgencyAdminAsync();
        if (!CanModerate(conv.Category, super, admin)) return Forbid();

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
        var conv = await db.SupportConversations.FirstOrDefaultAsync(c => c.Id == id);
        if (conv is null) return NotFound(new { message = "Conversation not found" });
        var super = await IsSuperAdminAsync();
        var admin = await IsAgencyAdminAsync();
        if (!CanModerate(conv.Category, super, admin)) return Forbid();
        conv.AssigneeEmail = Normalize(request.AssigneeEmail ?? string.Empty);
        conv.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("inbox/{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, StatusRequest request)
    {
        var conv = await db.SupportConversations.FirstOrDefaultAsync(c => c.Id == id);
        if (conv is null) return NotFound(new { message = "Conversation not found" });
        var super = await IsSuperAdminAsync();
        var admin = await IsAgencyAdminAsync();
        if (!CanModerate(conv.Category, super, admin)) return Forbid();
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
