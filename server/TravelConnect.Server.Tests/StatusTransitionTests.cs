using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Controllers;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Canonical conversation lifecycle: Open → Replied → Resolved → Closed,
/// with unread counters moving between the two sides on every message.
/// </summary>
public class StatusTransitionTests
{
    private static SupportController StaffController(TravelConnectDbContext db)
    {
        db.SystemUsers.Add(new SystemUser { FirebaseUid = "st", Email = "staff@tc.com", DisplayName = "Staff", Role = "Agency Admin", Status = "Active" });
        db.SaveChanges();
        return new SupportController(db, TestDb.FakeEmailService()).WithIdentity("st", "staff@tc.com");
    }

    private async Task<SupportConversation> SeedAsync(TravelConnectDbContext db, string status = "Open")
    {
        var conv = new SupportConversation
        {
            CustomerEmail = "c@tc.com",
            CustomerName = "Cust",
            Subject = "S",
            Category = "General",
            Status = status,
            AssigneeEmail = string.Empty,
            UnreadByAgent = 1,
            UnreadByCustomer = 0,
            LastMessageAt = DateTime.UtcNow,
            LastMessagePreview = "hello",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.SupportConversations.Add(conv);
        await db.SaveChangesAsync();
        return conv;
    }

    [Fact]
    public async Task Agent_reply_moves_open_to_replied_and_ping_customer()
    {
        using var db = TestDb.Create();
        var conv = await SeedAsync(db);
        var controller = StaffController(db);

        await controller.ReplyAsAgent(conv.Id, new AgentReplyRequest { Body = "We can help." });

        var saved = await db.SupportConversations.SingleAsync();
        Assert.Equal("Replied", saved.Status);
        Assert.Equal(0, saved.UnreadByAgent);
        Assert.Equal(1, saved.UnreadByCustomer);
    }

    [Fact]
    public async Task Customer_message_after_resolved_reopens_to_open()
    {
        using var db = TestDb.Create();
        var conv = await SeedAsync(db, status: "Resolved");
        var controller = new SupportController(db, TestDb.FakeEmailService()).WithIdentity("", "");

        await controller.SendMessage(conv.Id, new SendMessageRequest { SenderEmail = "c@tc.com", Body = "still broken" });

        var saved = await db.SupportConversations.SingleAsync();
        Assert.Equal("Open", saved.Status);
        Assert.Equal(2, saved.UnreadByAgent);
        Assert.Equal(0, saved.UnreadByCustomer);
    }

    [Fact]
    public async Task Agent_read_clears_unread_and_status_can_close()
    {
        using var db = TestDb.Create();
        var conv = await SeedAsync(db);
        conv.UnreadByAgent = 5;
        await db.SaveChangesAsync();
        var controller = StaffController(db);

        await controller.ReadAsAgent(conv.Id);
        Assert.Equal(0, (await db.SupportConversations.SingleAsync()).UnreadByAgent);

        await controller.SetStatus(conv.Id, new StatusRequest { Status = "Closed" });
        Assert.Equal("Closed", (await db.SupportConversations.SingleAsync()).Status);
    }

    [Fact]
    public async Task Full_lifecycle_tracks_unread_on_both_sides()
    {
        using var db = TestDb.Create();
        var conv = await SeedAsync(db); // UnreadByAgent = 1 (opened by customer)

        var staff = StaffController(db);
        var customer = new SupportController(db, TestDb.FakeEmailService()).WithIdentity("", "");

        // 1) customer writes → agent reads +1
        await customer.SendMessage(conv.Id, new SendMessageRequest { SenderEmail = "c@tc.com", Body = "more info" });
        var afterCustomer = await db.SupportConversations.SingleAsync();
        Assert.Equal(2, afterCustomer.UnreadByAgent);
        Assert.Equal(0, afterCustomer.UnreadByCustomer);

        // 2) agent replies → customer reads +1, status Replied
        await staff.ReplyAsAgent(conv.Id, new AgentReplyRequest { Body = "resolved, please confirm" });
        var afterReply = await db.SupportConversations.SingleAsync();
        Assert.Equal(0, afterReply.UnreadByAgent);
        Assert.Equal(1, afterReply.UnreadByCustomer);
        Assert.Equal("Replied", afterReply.Status);

        // 3) customer marks thread read → ping clears
        await customer.MarkRead(conv.Id, "c@tc.com");
        Assert.Equal(0, (await db.SupportConversations.SingleAsync()).UnreadByCustomer);
    }
}