using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Controllers;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Tests;

public class SupportControllerTests
{
    private static SupportController Controller(TravelConnectDbContext db, string? uid, string? email)
    {
        var c = new SupportController(db, TestDb.FakeEmailService());
        return c.WithIdentity(uid, email);
    }

    private static async Task<SupportConversation> SeedConversationAsync(
        TravelConnectDbContext db,
        string email = "cust@tc.com",
        string category = "General",
        string status = "Open",
        string body = "Hello")
    {
        var conv = new SupportConversation
        {
            CustomerEmail = email,
            CustomerName = "Customer",
            Subject = "Subject",
            Category = category,
            Status = status,
            AssigneeEmail = string.Empty,
            UnreadByAgent = string.IsNullOrEmpty(body) ? 0 : 1,
            UnreadByCustomer = 0,
            LastMessageAt = DateTime.UtcNow,
            LastMessagePreview = body ?? string.Empty,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.SupportConversations.Add(conv);
        await db.SaveChangesAsync();

        if (!string.IsNullOrEmpty(body))
        {
            db.SupportMessages.Add(new SupportMessage
            {
                SupportConversationId = conv.Id,
                SenderEmail = email,
                SenderName = "Customer",
                SenderType = "Customer",
                Body = body,
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
        return conv;
    }

    private static async Task SeedUserAsync(TravelConnectDbContext db, string uid, string email, string role, string status = "Active")
    {
        db.SystemUsers.Add(new SystemUser
        {
            FirebaseUid = uid,
            Email = email,
            DisplayName = role.Replace(" ", ""),
            Role = role,
            Status = status
        });
        await db.SaveChangesAsync();
    }

    /* ── conversations (customer side) ─────────────────────────────── */

    [Fact]
    public async Task MyConversations_returns_only_own_and_ordered_by_recent()
    {
        using var db = TestDb.Create();
        await SeedConversationAsync(db, "farm@tc.com", body: "older");
        await Task.Delay(5);
        var recent = await SeedConversationAsync(db, "farm@tc.com", category: "Subscription", body: "newer");
        await SeedConversationAsync(db, "other@tc.com");

        var result = await Controller(db, "", "").MyConversations("farm@tc.com");

        var items = Assert.IsAssignableFrom<List<SupportConversation>>(result.Value);
        Assert.Equal(2, items.Count);
        Assert.Equal(recent.Id, items[0].Id);
    }

    [Fact]
    public async Task MyConversations_supports_since_filter()
    {
        using var db = TestDb.Create();
        await SeedConversationAsync(db, "a@tc.com", body: "old");
        await Task.Delay(5);
        var cutoff = DateTime.UtcNow;
        await SeedConversationAsync(db, "a@tc.com", category: "Payment", body: "fresh");

        var result = await Controller(db, "", "").MyConversations("a@tc.com", since: cutoff);

        var items = Assert.IsAssignableFrom<List<SupportConversation>>(result.Value);
        Assert.Single(items);
        Assert.Equal("Payment", items[0].Category);
    }

    [Fact]
    public async Task CreateConversation_seeds_message_and_unread_counter()
    {
        using var db = TestDb.Create();
        var controller = Controller(db, "", "");

        var result = await controller.CreateConversation(new NewConversationRequest
        {
            Email = "Cust@TC.com",
            CustomerName = "Cust",
            Subject = "Baggage",
            Category = "General",
            Body = "My bag is lost"
        });

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var conv = Assert.IsType<SupportConversation>(created.Value);
        Assert.Equal("cust@tc.com", conv.CustomerEmail);
        Assert.Equal("Open", conv.Status);
        Assert.Equal(1, conv.UnreadByAgent);
        Assert.Equal(0, conv.UnreadByCustomer);

        Assert.Single(await db.SupportConversations.ToListAsync());
        var msg = Assert.Single(await db.SupportMessages.ToListAsync());
        Assert.Equal("My bag is lost", msg.Body);
        Assert.Equal("Customer", msg.SenderType);
    }

    [Fact]
    public async Task CreateConversation_without_body_has_zero_unread()
    {
        using var db = TestDb.Create();

        var result = await Controller(db, "", "").CreateConversation(new NewConversationRequest
        {
            Email = "x@tc.com",
            Subject = "Empty"
        });

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var conv = Assert.IsType<SupportConversation>(created.Value);
        Assert.Equal(0, conv.UnreadByAgent);
        Assert.Empty(await db.SupportMessages.ToListAsync());
    }

    [Fact]
    public async Task SendMessage_increments_agent_unread_and_flags_new_activity()
    {
        using var db = TestDb.Create();
        var conv = await SeedConversationAsync(db, "c@tc.com", body: "first");

        var result = await Controller(db, "", "").SendMessage(conv.Id, new SendMessageRequest
        {
            SenderEmail = "c@tc.com",
            SenderName = "Cust",
            Body = "second"
        });

        Assert.IsType<OkObjectResult>(result.Result);
        var updated = await db.SupportConversations.SingleAsync();
        Assert.Equal(2, updated.UnreadByAgent);
        Assert.Equal(0, updated.UnreadByCustomer);
        Assert.Equal("second", updated.LastMessagePreview);
        Assert.Equal(2, await db.SupportMessages.CountAsync());
    }

    [Fact]
    public async Task SendMessage_matches_customer_by_lowercase_email()
    {
        using var db = TestDb.Create();
        var conv = await SeedConversationAsync(db, "c@tc.com", body: "first");

        var result = await Controller(db, "", "").SendMessage(conv.Id, new SendMessageRequest
        {
            SenderEmail = "C@tc.com",
            Body = "ignored if case missing"
        });

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(2, await db.SupportMessages.CountAsync());
    }

    [Fact]
    public async Task SendMessage_on_resolved_conversation_reopens_it()
    {
        using var db = TestDb.Create();
        var conv = await SeedConversationAsync(db, "c@tc.com", status: "Resolved", body: "done");

        await Controller(db, "", "").SendMessage(conv.Id, new SendMessageRequest
        {
            SenderEmail = "c@tc.com",
            Body = "actually not solved"
        });

        Assert.Equal("Open", (await db.SupportConversations.SingleAsync()).Status);
    }

    [Fact]
    public async Task SendMessage_unknown_conversation_returns_not_found()
    {
        using var db = TestDb.Create();
        var result = await Controller(db, "", "").SendMessage(999, new SendMessageRequest { SenderEmail = "c@tc.com", Body = "x" });
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task MarkRead_clears_customer_unread()
    {
        using var db = TestDb.Create();
        var conv = await SeedConversationAsync(db, "c@tc.com", body: "hi");
        conv.UnreadByCustomer = 3;
        await db.SaveChangesAsync();

        var result = await Controller(db, "", "").MarkRead(conv.Id, "c@tc.com");

        Assert.IsType<NoContentResult>(result);
        Assert.Equal(0, (await db.SupportConversations.SingleAsync()).UnreadByCustomer);
    }

    [Fact]
    public async Task GetThread_scopes_to_owner()
    {
        using var db = TestDb.Create();
        var mine = await SeedConversationAsync(db, "me@tc.com");
        await SeedConversationAsync(db, "other@tc.com");

        var mineResult = await Controller(db, "", "").GetThread(mine.Id, "me@tc.com");
        Assert.IsType<OkObjectResult>(mineResult.Result);

        var other = await db.SupportConversations.FirstAsync(c => c.CustomerEmail == "other@tc.com");
        var otherResult = await Controller(db, "", "").GetThread(other.Id, "me@tc.com");
        Assert.IsType<NotFoundObjectResult>(otherResult.Result);
    }

    /* ── inbox (agent side) ────────────────────────────────────────── */

    [Fact]
    public async Task Inbox_enforces_tier_split_by_role()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "su", "super@tc.com", "Super Admin");
        await SeedUserAsync(db, "st", "staff@tc.com", "Agency Admin");
        await SeedConversationAsync(db, "c@tc.com", category: "Subscription");
        await SeedConversationAsync(db, "d@tc.com", category: "General");

        var superTier = await Controller(db, "su", "super@tc.com").Inbox(category: "Subscription");
        var list = Assert.IsAssignableFrom<List<SupportConversation>>(superTier.Value);
        Assert.Single(list);

        var staffTier = await Controller(db, "st", "staff@tc.com").Inbox(category: "Subscription");
        Assert.IsType<ForbidResult>(staffTier.Result);

        var staffGeneral = await Controller(db, "st", "staff@tc.com").Inbox();
        var staffList = Assert.IsAssignableFrom<List<SupportConversation>>(staffGeneral.Value);
        // Agency Admin's unscoped inbox must exclude Subscription (tier) threads they
        // cannot moderate; only the Super Admin's tier inbox may see them.
        Assert.Single(staffList);
        Assert.Equal("General", staffList[0].Category);

        var staffAll = await Controller(db, "st", "staff@tc.com").Inbox(category: "All");
        var staffAllList = Assert.IsAssignableFrom<List<SupportConversation>>(staffAll.Value);
        Assert.Single(staffAllList);
        Assert.Equal("General", staffAllList[0].Category);

        var superGeneral = await Controller(db, "su", "super@tc.com").Inbox();
        Assert.IsType<ForbidResult>(superGeneral.Result);
    }

    [Fact]
    public async Task Inbox_forbids_agency_staff_from_both_inboxes()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "st", "staff@tc.com", "Agency Staff");
        await SeedConversationAsync(db, "c@tc.com", category: "General");

        var tier = await Controller(db, "st", "staff@tc.com").Inbox(category: "Subscription");
        Assert.IsType<ForbidResult>(tier.Result);

        var problems = await Controller(db, "st", "staff@tc.com").Inbox();
        Assert.IsType<ForbidResult>(problems.Result);
    }

    [Fact]
    public async Task Inbox_forbids_super_admin_from_customer_problems()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "su", "super@tc.com", "Super Admin");
        await SeedConversationAsync(db, "c@tc.com", category: "General");

        var problems = await Controller(db, "su", "super@tc.com").Inbox();
        Assert.IsType<ForbidResult>(problems.Result);

        var all = await Controller(db, "su", "super@tc.com").Inbox(category: "All");
        Assert.IsType<ForbidResult>(all.Result);
    }

    [Fact]
    public async Task Inbox_filters_by_status_and_assignee()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "st", "staff@tc.com", "Agency Admin");
        await SeedConversationAsync(db, "a@tc.com", status: "Open");
        await SeedConversationAsync(db, "b@tc.com", status: "Replied");
        var assigned = await SeedConversationAsync(db, "c@tc.com", status: "Open");
        assigned.AssigneeEmail = "staff@tc.com";
        assigned.UnreadByAgent = 0;
        await db.SaveChangesAsync();

        var openOnly = await Controller(db, "st", "staff@tc.com").Inbox(status: "Open");
        var openList = Assert.IsAssignableFrom<List<SupportConversation>>(openOnly.Value);
        Assert.Equal(2, openList.Count);

        var mineOnly = await Controller(db, "st", "staff@tc.com").Inbox(assignee: "staff@tc.com");
        var mineList = Assert.IsAssignableFrom<List<SupportConversation>>(mineOnly.Value);
        Assert.Single(mineList);
    }

    /* ── agent actions ─────────────────────────────────────────────── */

    [Fact]
    public async Task ReplyAsAgent_sets_status_and_increments_customer_unread()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "st", "staff@tc.com", "Agency Admin");
        var conv = await SeedConversationAsync(db, "c@tc.com", body: "help");

        var result = await Controller(db, "st", "staff@tc.com").ReplyAsAgent(conv.Id, new AgentReplyRequest { AgentName = "S", Body = "We are on it" });

        Assert.IsType<OkObjectResult>(result.Result);
        var updated = await db.SupportConversations.SingleAsync();
        Assert.Equal("Replied", updated.Status);
        Assert.Equal(1, updated.UnreadByCustomer);
        Assert.Equal(0, updated.UnreadByAgent);

        var msg = Assert.IsType<SupportMessage>(((OkObjectResult)result.Result!).Value);
        Assert.Equal("Agent", msg.SenderType);
        Assert.Equal("staff@tc.com", msg.SenderEmail);
    }

    [Fact]
    public async Task ReplyAsAgent_forbidden_for_wrong_team_on_subscription()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "st", "staff@tc.com", "Agency Admin");
        var conv = await SeedConversationAsync(db, "c@tc.com", category: "Subscription");

        var result = await Controller(db, "st", "staff@tc.com").ReplyAsAgent(conv.Id, new AgentReplyRequest { Body = "x" });

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task ReplyAsAgent_forbidden_for_super_admin_on_customer_problem()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "su", "super@tc.com", "Super Admin");
        var conv = await SeedConversationAsync(db, "c@tc.com", category: "General", body: "help");

        var result = await Controller(db, "su", "super@tc.com").ReplyAsAgent(conv.Id, new AgentReplyRequest { Body = "x" });

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task ReplyAsAgentByEmail_requires_body_and_customer_email()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "su", "super@tc.com", "Super Admin");
        var conv = await SeedConversationAsync(db, "c@tc.com", category: "Subscription", body: "tier?");

        var ctrl = Controller(db, "su", "super@tc.com");

        var emptyBody = await ctrl.ReplyAsAgentByEmail(conv.Id, new AgentReplyRequest { Body = "   " });
        Assert.IsType<BadRequestObjectResult>(emptyBody.Result);

        var noEmail = await SeedConversationAsync(db, "c@tc.com", category: "Subscription", body: "other");
        noEmail.CustomerEmail = "";
        await db.SaveChangesAsync();
        noEmail.CustomerEmail = "";
        var noEmailResult = await ctrl.ReplyAsAgentByEmail(noEmail.Id, new AgentReplyRequest { Body = "hi" });
        Assert.IsType<BadRequestObjectResult>(noEmailResult.Result);
    }

    [Fact]
    public async Task ReplyAsAgentByEmail_no_smtp_returns_sent_false_and_logs()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "su", "super@tc.com", "Super Admin");
        var conv = await SeedConversationAsync(db, "c@tc.com", category: "Subscription", body: "tier?");

        var result = await Controller(db, "su", "super@tc.com").ReplyAsAgentByEmail(conv.Id, new AgentReplyRequest { AgentName = "S", Body = "Here is the tier info" });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var json = TestDb.ToJson(ok.Value);
        Assert.False(json.GetProperty("sent").GetBoolean());
        Assert.Equal("c@tc.com", json.GetProperty("email").GetString());

        var updated = await db.SupportConversations.SingleAsync();
        Assert.Equal("Replied", updated.Status);
        Assert.Equal(1, updated.UnreadByCustomer);
    }

    [Fact]
    public async Task Assign_normalizes_assignee_email()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "st", "staff@tc.com", "Agency Admin");
        var conv = await SeedConversationAsync(db, "c@tc.com");

        var result = await Controller(db, "st", "staff@tc.com").Assign(conv.Id, new AssignRequest { AssigneeEmail = "  STAFF@tc.com  " });

        Assert.IsType<NoContentResult>(result);
        Assert.Equal("staff@tc.com", (await db.SupportConversations.SingleAsync()).AssigneeEmail);
    }

    [Fact]
    public async Task SetStatus_applies_canonical_status()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "st", "staff@tc.com", "Agency Admin");
        var conv = await SeedConversationAsync(db, "c@tc.com", status: "Open");

        var ctrl = Controller(db, "st", "staff@tc.com");

        await ctrl.SetStatus(conv.Id, new StatusRequest { Status = "Closed" });
        Assert.Equal("Closed", (await db.SupportConversations.SingleAsync()).Status);

        await ctrl.SetStatus(conv.Id, new StatusRequest { Status = "Open" });
        Assert.Equal("Open", (await db.SupportConversations.SingleAsync()).Status);
    }

    /* ── agents roster ─────────────────────────────────────────────── */

    [Fact]
    public async Task Agents_returns_only_active_support_roles()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "su", "super@tc.com", "Super Admin");
        await SeedUserAsync(db, "ad", "admin@tc.com", "Agency Admin");
        await SeedUserAsync(db, "st", "staff@tc.com", "Agency Staff");
        await SeedUserAsync(db, "su2", "super2@tc.com", "Super Admin", status: "Inactive");
        await SeedUserAsync(db, "cu", "cust@tc.com", "Customer");

        var result = await Controller(db, "su", "super@tc.com").Agents();

        var agents = Assert.IsAssignableFrom<IEnumerable<object>>(result.Value).ToList();
        var emails = TestDb.ToJson(agents)
            .EnumerateArray()
            .Select(e => e.GetProperty("email").GetString())
            .ToList();
        Assert.Equal(2, emails.Count);
        Assert.DoesNotContain("cust@tc.com", emails);
        Assert.DoesNotContain("super2@tc.com", emails);
        // Agency Staff no longer own a support inbox, so they are not assignable.
        Assert.DoesNotContain("staff@tc.com", emails);
    }

    [Fact]
    public async Task Agents_forbidden_for_non_support_roles()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "cu", "cust@tc.com", "Customer");

        var result = await Controller(db, "cu", "cust@tc.com").Agents();
        Assert.IsType<ForbidResult>(result.Result);
    }
}