using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Controllers;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;
using Xunit;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Unit Test Phase 4 — the review endpoints. The service tests prove the
/// business rules; these prove the HTTP surface: the role is resolved from the
/// SystemUser row (never from the body), a forbidden caller gets 403, a request
/// that was already decided gets 409, and the response body carries the numbers
/// the UI needs.
/// </summary>
public class CancellationReviewsControllerTests
{
    private static readonly DateTime Now = new(2026, 6, 11, 9, 0, 0, DateTimeKind.Utc);

    private static CancellationReviewsController Controller(TravelConnectDbContext db, string? uid, string? email)
    {
        var reviews = new CancellationReviewService(db, new CancellationQuoteService(db, new CancellationPolicyService(db)));
        return new CancellationReviewsController(reviews, new StaffContextService(db)).WithIdentity(uid, email);
    }

    private static async Task<(TravelConnectDbContext Db, int CancellationId)> SeedAsync(
        string role = StaffRoles.AgencyAdmin,
        string status = "Active")
    {
        var db = TestDb.Create();

        db.SystemUsers.Add(new SystemUser
        {
            Email = "manager@tc.com",
            FirebaseUid = "uid-manager",
            Role = role,
            Status = status,
            DisplayName = "Manager",
        });
        // A finance account that may read the queue but not decide anything.
        db.SystemUsers.Add(new SystemUser
        {
            Email = "finance@tc.com",
            FirebaseUid = "uid-finance",
            Role = StaffRoles.FinanceStaff,
            Status = "Active",
            DisplayName = "Finance",
        });

        var booking = CancellationFixtures.Booking(departure: Now.AddHours(120), createdAt: Now.AddHours(-240));
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var cancellation = CancellationFixtures.Cancellation(booking);
        cancellation.Status = CancellationStatuses.Requested;
        cancellation.RequiresApproval = true;
        cancellation.AutoApproved = false;
        cancellation.DecidedAt = null;
        cancellation.ApprovedAt = null;
        cancellation.ApprovedBy = string.Empty;
        cancellation.RefundAmount = 6525m;
        cancellation.RequestedAt = Now.AddHours(-3);
        db.BookingCancellations.Add(cancellation);
        booking.Status = BookingStatusValues.CancellationRequested;
        booking.ActiveCancellationId = cancellation.Id;
        booking.CancellationStatus = CancellationStatuses.Requested;
        await db.SaveChangesAsync();

        return (db, cancellation.Id);
    }

    /// <summary>
    /// Serializes the result the way ASP.NET actually returns it (camelCase), so
    /// these assertions describe the wire format the admin UI consumes.
    /// </summary>
    private static JsonElement Body(IActionResult result) =>
        JsonSerializer.SerializeToElement(
            result is ObjectResult obj ? obj.Value : null,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

    [Fact]
    public async Task The_queue_returns_the_pending_requests_with_permission_flags()
    {
        var (db, cancellationId) = await SeedAsync();
        using var _ = db;

        var result = await Controller(db, "uid-manager", "manager@tc.com").List(null, null, null, null);
        var body = Body(result);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok);
        Assert.Equal(1, body.GetProperty("total").GetInt32());
        Assert.Equal(cancellationId, body.GetProperty("items")[0].GetProperty("id").GetInt32());
        Assert.True(body.GetProperty("canApprove").GetBoolean());
        Assert.True(body.GetProperty("canOverrideAmount").GetBoolean());
    }

    [Fact]
    public async Task Finance_may_read_the_queue_but_is_told_it_cannot_decide()
    {
        var (db, _) = await SeedAsync();
        using var _ = db;

        var body = Body(await Controller(db, "uid-finance", "finance@tc.com").List(null, null, null, null));

        Assert.False(body.GetProperty("canApprove").GetBoolean());
        Assert.False(body.GetProperty("canOverrideAmount").GetBoolean());
        Assert.Equal(1, body.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task A_customer_account_cannot_even_read_the_queue()
    {
        var (db, _) = await SeedAsync();
        using var _ = db;

        var controller = Controller(db, "uid-customer", "juan@tc.com");
        var listed = await controller.List(null, null, null, null);
        var detail = await controller.Detail(1);
        var approved = await controller.Approve(1, new ApproveCancellationRequest());
        var rejected = await controller.Reject(1, new RejectCancellationRequest { Reason = "no" });

        Assert.IsType<ForbidResult>(listed);
        Assert.IsType<ForbidResult>(detail);
        Assert.IsType<ForbidResult>(approved);
        Assert.IsType<ForbidResult>(rejected);
    }

    [Fact]
    public async Task A_suspended_manager_cannot_decide()
    {
        var (db, _) = await SeedAsync(status: "Suspended");
        using var _ = db;

        var result = await Controller(db, "uid-manager", "manager@tc.com")
            .Approve(1, new ApproveCancellationRequest { Notes = "please" });

        Assert.IsType<ForbidResult>(result);
        Assert.Equal(CancellationStatuses.Requested, (await db.BookingCancellations.FirstAsync()).Status);
    }

    [Fact]
    public async Task Approving_returns_the_refund_and_the_new_booking_status()
    {
        var (db, cancellationId) = await SeedAsync();
        using var _ = db;

        var result = await Controller(db, "uid-manager", "manager@tc.com")
            .Approve(cancellationId, new ApproveCancellationRequest { Notes = "Approved as requested." });

        var body = Body(result);
        Assert.IsType<OkObjectResult>(result);
        Assert.True(body.GetProperty("success").GetBoolean());
        Assert.Equal("Pending", body.GetProperty("refund").GetProperty("status").GetString());
        Assert.Equal(6525m, body.GetProperty("refund").GetProperty("amount").GetDecimal());
        Assert.Equal(BookingStatusValues.Cancelled, body.GetProperty("bookingStatus").GetString());
        Assert.Equal(
            CancellationStatuses.Approved,
            body.GetProperty("cancellation").GetProperty("status").GetString());
    }

    [Fact]
    public async Task Approving_twice_is_a_conflict_not_a_second_refund()
    {
        var (db, cancellationId) = await SeedAsync();
        using var _ = db;

        var controller = Controller(db, "uid-manager", "manager@tc.com");
        await controller.Approve(cancellationId, new ApproveCancellationRequest());
        var second = await controller.Approve(cancellationId, new ApproveCancellationRequest());

        var conflict = Assert.IsType<ConflictObjectResult>(second);
        Assert.Contains("already", Body(conflict).GetProperty("message").GetString()!, StringComparison.OrdinalIgnoreCase);
        Assert.Single(await db.BookingRefunds.ToListAsync());
    }

    [Fact]
    public async Task Rejecting_without_a_reason_is_a_bad_request()
    {
        var (db, cancellationId) = await SeedAsync();
        using var _ = db;

        var result = await Controller(db, "uid-manager", "manager@tc.com")
            .Reject(cancellationId, new RejectCancellationRequest { Reason = "  " });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(CancellationStatuses.Requested, (await db.BookingCancellations.FirstAsync()).Status);
    }

    [Fact]
    public async Task Deciding_an_unknown_request_is_a_not_found()
    {
        var (db, _) = await SeedAsync();
        using var _ = db;

        var controller = Controller(db, "uid-manager", "manager@tc.com");
        Assert.IsType<NotFoundObjectResult>(await controller.Approve(999, new ApproveCancellationRequest()));
        Assert.IsType<NotFoundObjectResult>(await controller.Reject(999, new RejectCancellationRequest { Reason = "x" }));
    }

    [Fact]
    public async Task An_amount_override_is_refused_for_a_finance_caller()
    {
        var (db, cancellationId) = await SeedAsync();
        using var _ = db;

        // Finance can read the queue but has no approval permission at all, so
        // the amount override is refused before any decision is attempted.
        var result = await Controller(db, "uid-finance", "finance@tc.com")
            .Approve(cancellationId, new ApproveCancellationRequest { RefundAmount = 1m });

        Assert.IsType<ForbidResult>(result);
        Assert.Equal(CancellationStatuses.Requested, (await db.BookingCancellations.FirstAsync()).Status);
    }

    [Fact]
    public async Task The_detail_view_returns_the_frozen_breakdown_and_the_booking()
    {
        var (db, cancellationId) = await SeedAsync();
        using var _ = db;

        var body = Body(await Controller(db, "uid-manager", "manager@tc.com").Detail(cancellationId));

        Assert.Equal(6525m, body.GetProperty("cancellation").GetProperty("refundAmount").GetDecimal());
        Assert.Equal(10000m, body.GetProperty("cancellation").GetProperty("originalAmount").GetDecimal());
        Assert.Equal("TC-2026-0001", body.GetProperty("booking").GetProperty("referenceNumber").GetString());
        Assert.True(body.GetProperty("canApprove").GetBoolean());
    }

    [Fact]
    public async Task The_detail_view_of_an_unknown_request_is_a_not_found()
    {
        var (db, _) = await SeedAsync();
        using var _ = db;

        Assert.IsType<NotFoundObjectResult>(await Controller(db, "uid-manager", "manager@tc.com").Detail(4242));
    }

    [Fact]
    public async Task The_queue_passes_its_filters_through_and_caps_the_page_size()
    {
        var (db, _) = await SeedAsync();
        using var _ = db;

        var body = Body(await Controller(db, "uid-manager", "manager@tc.com")
            .List("pending", "juan", page: 1, pageSize: 5000));

        // The client asked for 5000 rows; the response says what it really gave.
        Assert.Equal(CancellationReviewService.MaxPageSize, body.GetProperty("pageSize").GetInt32());
        Assert.Equal(1, body.GetProperty("page").GetInt32());
    }
}
