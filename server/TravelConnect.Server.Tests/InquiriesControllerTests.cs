using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Controllers;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Tests;

public class InquiriesControllerTests
{
    private static InquiriesController Controller(TravelConnectDbContext db) =>
        new(db, TestDb.FakeEmailJsService(), TestDb.FakeEmailService());

    private static Inquiry Inquiry(
        string name = "Juan", string email = "juan@tc.com",
        string subject = "Flight issue", string category = "Flight",
        string message = "My flight was delayed", string status = "Pending") =>
        new()
        {
            CustomerName = name,
            CustomerEmail = email,
            Subject = subject,
            Category = category,
            Message = message,
            Status = status,
            Reply = string.Empty
        };

    /* ── Create ─────────────────────────────────────────────────────── */

    [Fact]
    public async Task Create_pipes_inquiry_into_lead_and_support_thread()
    {
        using var db = TestDb.Create();
        var controller = Controller(db);

        var result = await controller.Create(Inquiry());

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var saved = Assert.IsType<Inquiry>(created.Value);
        Assert.Equal("Flight issue", saved.Subject);

        Assert.Single(await db.Leads.ToListAsync());
        var lead = await db.Leads.SingleAsync();
        Assert.Equal("juan@tc.com", lead.Email);
        Assert.Equal("New", lead.Stage);
        Assert.Equal("Website", lead.Source);

        Assert.Single(await db.SupportConversations.ToListAsync());
        Assert.Single(await db.SupportMessages.ToListAsync());
        var conv = await db.SupportConversations.SingleAsync();
        Assert.Equal("Flight", conv.Category);
        Assert.Equal("Open", conv.Status);
        Assert.Equal(1, conv.UnreadByAgent);
    }

    [Fact]
    public async Task Create_reuses_open_thread_for_same_email_and_category()
    {
        using var db = TestDb.Create();
        var controller = Controller(db);

        await controller.Create(Inquiry());
        await controller.Create(Inquiry(message: "Same customer, second message"));

        Assert.Single(await db.SupportConversations.ToListAsync());
        var conv = await db.SupportConversations.SingleAsync();
        Assert.Equal(2, conv.UnreadByAgent);
        Assert.Equal(2, await db.SupportMessages.CountAsync());
    }

    [Fact]
    public async Task Create_creates_separate_thread_for_different_category()
    {
        using var db = TestDb.Create();
        var controller = Controller(db);

        await controller.Create(Inquiry());
        await controller.Create(Inquiry(category: "Payment", message: "Refund please"));

        Assert.Equal(2, await db.SupportConversations.CountAsync());
    }

    [Fact]
    public async Task Create_creates_separate_thread_when_labeled_resolved()
    {
        using var db = TestDb.Create();
        var controller = Controller(db);

        await controller.Create(Inquiry(message: "first"));
        var conv = await db.SupportConversations.SingleAsync();
        conv.Status = "Resolved";
        await db.SaveChangesAsync();

        await controller.Create(Inquiry(message: "follow-up"));

        Assert.Equal(2, await db.SupportConversations.CountAsync());
    }

    [Fact]
    public async Task Create_reuses_existing_lead_instead_of_duplicating()
    {
        using var db = TestDb.Create();
        var controller = Controller(db);

        await controller.Create(Inquiry());
        var before = await db.Leads.SingleAsync();

        await controller.Create(Inquiry(subject: "Another issue"));

        Assert.Single(await db.Leads.ToListAsync());
        Assert.Equal(before.Id, (await db.Leads.SingleAsync()).Id);
    }

    [Fact]
    public async Task Create_without_email_skips_lead_and_thread()
    {
        using var db = TestDb.Create();
        var controller = Controller(db);

        await controller.Create(Inquiry(email: ""));

        Assert.Empty(await db.Leads.ToListAsync());
        Assert.Empty(await db.SupportConversations.ToListAsync());
        Assert.Empty(await db.SupportMessages.ToListAsync());
    }

    /* ── SendNotification ───────────────────────────────────────────── */

    [Fact]
    public async Task SendNotification_rejects_missing_name()
    {
        using var db = TestDb.Create();
        var result = await Controller(db).SendNotification(new InquiryNotifyRequest { Name = "  ", Email = "a@b.com" });
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task SendNotification_rejects_invalid_email()
    {
        using var db = TestDb.Create();
        var result = await Controller(db).SendNotification(new InquiryNotifyRequest { Name = "X", Email = "@tc.com" });
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task SendNotification_rejects_oversized_message()
    {
        using var db = TestDb.Create();
        var result = await Controller(db).SendNotification(new InquiryNotifyRequest
        {
            Name = "X",
            Email = "a@tc.com",
            Message = new string('a', 2001)
        });
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task SendNotification_valid_short_circuits_with_unsent_and_logs_history()
    {
        using var db = TestDb.Create();
        var result = await Controller(db).SendNotification(new InquiryNotifyRequest
        {
            Name = "X",
            Email = "a@tc.com",
            Tier = "Premium",
            PlanName = "Pro"
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = TestDb.ToJson(ok.Value);
        Assert.False(json.GetProperty("sent").GetBoolean());

        var log = Assert.Single(await db.EmailLogs.ToListAsync());
        Assert.Equal("subscription_inquiry_notice", log.Type);
        Assert.Equal("Failed", log.Status);
    }

    /* ── Update ─────────────────────────────────────────────────────── */

    [Fact]
    public async Task Update_rejects_id_mismatch()
    {
        using var db = TestDb.Create();
        var created = await Controller(db).Create(Inquiry());
        var inquiry = ((CreatedAtActionResult)created.Result!).Value as Inquiry;

        Assert.NotNull(inquiry);
        var result = await Controller(db).Update(inquiry!.Id + 1, inquiry);
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Update_missing_record_returns_not_found()
    {
        using var db = TestDb.Create();
        var missing = Inquiry();
        missing.Id = 404;
        var result = await Controller(db).Update(404, missing);
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Update_applies_reply_and_touches_updated_at()
    {
        using var db = TestDb.Create();
        var result = await Controller(db).Create(Inquiry());
        var inquiry = ((CreatedAtActionResult)result.Result!).Value as Inquiry;
        Assert.NotNull(inquiry);

        await Task.Delay(5);
        inquiry!.Reply = "We resolved this.";
        await Controller(db).Update(inquiry.Id, inquiry);

        var saved = await db.Inquiries.SingleAsync();
        Assert.Equal("We resolved this.", saved.Reply);
        Assert.True(saved.UpdatedAt >= saved.CreatedAt);
    }

    [Fact]
    public async Task Update_preserves_original_created_at()
    {
        using var db = TestDb.Create();
        var result = await Controller(db).Create(Inquiry());
        var inquiry = ((CreatedAtActionResult)result.Result!).Value as Inquiry;
        Assert.NotNull(inquiry);

        var originalCreated = inquiry!.CreatedAt;
        await Task.Delay(5);
        await Controller(db).Update(inquiry.Id, inquiry);

        Assert.Equal(originalCreated, (await db.Inquiries.SingleAsync()).CreatedAt);
    }

    /* ── Delete / read ──────────────────────────────────────────────── */

    [Fact]
    public async Task Delete_missing_record_returns_not_found()
    {
        using var db = TestDb.Create();
        Assert.IsType<NotFoundObjectResult>(await Controller(db).Delete(404));
    }

    [Fact]
    public async Task Delete_removes_record()
    {
        using var db = TestDb.Create();
        var result = await Controller(db).Create(Inquiry());
        var inquiry = ((CreatedAtActionResult)result.Result!).Value as Inquiry;
        Assert.NotNull(inquiry);

        Assert.IsType<NoContentResult>(await Controller(db).Delete(inquiry!.Id));
        Assert.Empty(await db.Inquiries.ToListAsync());
    }

    [Fact]
    public async Task GetById_returns_404_for_unknown()
    {
        using var db = TestDb.Create();
        var result = await Controller(db).GetById(999);
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }
}