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
/// Unit Test Phase 5 — the finance endpoints over HTTP. The rules live in
/// <see cref="RefundProcessingService"/>; these pin the surface the admin console
/// depends on: the role comes from the SystemUser row, a viewer gets 403, a bad
/// status is 400, an out-of-order action is 409, a missing refund is 404, and the
/// body carries the state the customer will be shown. It also proves the legacy
/// payments shortcut can no longer pay a cancelled booking behind the queue's back.
/// </summary>
public class RefundsControllerTests
{
    private static readonly DateTime Now = new(2026, 6, 12, 9, 0, 0, DateTimeKind.Utc);

    private static RefundsController Controller(TravelConnectDbContext db, string? uid, string? email) =>
        new RefundsController(new RefundProcessingService(db), new StaffContextService(db)).WithIdentity(uid, email);

    private static PaymentsController Payments(TravelConnectDbContext db, string? uid, string? email) =>
        new PaymentsController(db, null!, null!, new StaffContextService(db)).WithIdentity(uid, email);

    private static async Task<(TravelConnectDbContext Db, int RefundId, int PaymentId)> SeedAsync(
        decimal refundAmount = 6525m,
        string status = RefundStatuses.Pending,
        bool financeCanProcess = true)
    {
        var db = TestDb.Create();

        db.SystemUsers.Add(new SystemUser
        {
            Email = "finance@tc.com",
            FirebaseUid = "uid-finance",
            Role = financeCanProcess ? StaffRoles.FinanceStaff : StaffRoles.AgencyStaff,
            Status = "Active",
            DisplayName = "Finance",
        });

        var booking = CancellationFixtures.Booking(departure: Now.AddHours(96));
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var payment = new Payment
        {
            ReferenceId = "pay_abc123",
            BookingId = booking.Id,
            CustomerName = booking.CustomerName,
            PackageName = booking.PackageName,
            Amount = 10000m,
            Method = "gcash",
            Status = "Paid",
            PaymentDate = "2026-06-01",
        };
        db.Payments.Add(payment);

        var cancellation = CancellationFixtures.Cancellation(booking, CancellationStatuses.Approved);
        cancellation.RefundAmount = refundAmount;
        db.BookingCancellations.Add(cancellation);

        var refund = CancellationFixtures.Refund(cancellation, status);
        refund.Amount = refundAmount;
        refund.CalculatedAmount = refundAmount;
        refund.PaymentId = payment.Id;
        db.BookingRefunds.Add(refund);

        booking.Status = BookingStatusValues.Cancelled;
        booking.CancellationStatus = CancellationStatuses.Approved;
        booking.Paid = false;

        await db.SaveChangesAsync();
        return (db, refund.Id, payment.Id);
    }

    private static JsonElement Body(IActionResult result) =>
        JsonSerializer.SerializeToElement(
            result is ObjectResult obj ? obj.Value : null,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

    [Fact]
    public async Task The_queue_lists_the_money_still_to_be_moved()
    {
        var (db, refundId, _) = await SeedAsync();
        using var _ = db;

        var body = Body(await Controller(db, "uid-finance", "finance@tc.com").List(null, null, null, null));

        Assert.Equal(1, body.GetProperty("total").GetInt32());
        var item = body.GetProperty("items")[0];
        Assert.Equal(refundId, item.GetProperty("id").GetInt32());
        Assert.Equal("RFND-2026-000001", item.GetProperty("reference").GetString());
        Assert.Equal("gcash", item.GetProperty("method").GetString());
        Assert.Equal(6525m, item.GetProperty("amount").GetDecimal());
        Assert.Equal("Juan Dela Cruz", item.GetProperty("customerName").GetString());
        Assert.True(body.GetProperty("canProcess").GetBoolean());
    }

    [Fact]
    public async Task A_read_only_role_may_look_but_not_move_money()
    {
        var (db, _, _) = await SeedAsync(financeCanProcess: false);
        using var _ = db;

        var controller = Controller(db, "uid-finance", "finance@tc.com");

        var body = Body(await controller.List(null, null, null, null));
        Assert.Equal(1, body.GetProperty("total").GetInt32());
        Assert.False(body.GetProperty("canProcess").GetBoolean());

        // Reading is fine; every action is 403.
        Assert.IsType<ForbidResult>(await controller.Release(1, null));
        Assert.IsType<ForbidResult>(await controller.Process(1, null));
        Assert.IsType<ForbidResult>(await controller.Complete(1, null));
        Assert.IsType<ForbidResult>(await controller.Fail(1, null));
        Assert.IsType<ForbidResult>(await controller.Retry(1, null));
    }

    [Fact]
    public async Task A_customer_account_cannot_reach_the_queue_at_all()
    {
        var (db, _, _) = await SeedAsync();
        using var _ = db;

        var controller = Controller(db, null, "juan@tc.com");

        Assert.IsType<ForbidResult>(await controller.List(null, null, null, null));
        Assert.IsType<ForbidResult>(await controller.Release(1, null));
    }

    [Fact]
    public async Task Releasing_a_refund_links_the_payment_and_mirrors_the_booking()
    {
        var (db, refundId, paymentId) = await SeedAsync();
        using var _ = db;

        var result = await Controller(db, "uid-finance", "finance@tc.com")
            .Release(refundId, new RefundActionRequest { Notes = "With the morning batch." });
        var body = Body(result);

        Assert.IsType<OkObjectResult>(result);
        Assert.True(body.GetProperty("success").GetBoolean());
        Assert.Equal(RefundStatuses.Approved, body.GetProperty("refund").GetProperty("status").GetString());
        Assert.Equal("finance@tc.com", body.GetProperty("refund").GetProperty("approvedBy").GetString());
        Assert.Equal(paymentId, body.GetProperty("refund").GetProperty("paymentId").GetInt32());
        Assert.Equal(BookingStatusValues.RefundPending, body.GetProperty("bookingStatus").GetString());
        Assert.Equal(CancellationStatuses.RefundPending, body.GetProperty("cancellationStatus").GetString());
    }

    [Fact]
    public async Task A_cash_refund_cannot_be_completed_without_a_reference()
    {
        var (db, refundId, _) = await SeedAsync(status: RefundStatuses.Processing);
        using var _ = db;

        var result = await Controller(db, "uid-finance", "finance@tc.com")
            .Complete(refundId, new RefundActionRequest());

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("reference", bad.Value!.ToString());
        Assert.Equal(RefundStatuses.Processing, (await db.BookingRefunds.FirstAsync()).Status);
    }

    [Fact]
    public async Task Completing_a_refund_settles_the_booking_and_returns_the_money_moved()
    {
        var (db, refundId, _) = await SeedAsync(status: RefundStatuses.Processing);
        using var _ = db;

        var body = Body(await Controller(db, "uid-finance", "finance@tc.com")
            .Complete(refundId, new RefundActionRequest { RefundReference = "TRACE-77123" }));

        Assert.Equal(RefundStatuses.Completed, body.GetProperty("refund").GetProperty("status").GetString());
        Assert.Equal("TRACE-77123", body.GetProperty("refund").GetProperty("refundReference").GetString());
        Assert.Equal(BookingStatusValues.Refunded, body.GetProperty("bookingStatus").GetString());
    }

    [Fact]
    public async Task An_out_of_order_action_is_a_conflict_and_moves_nothing()
    {
        var (db, refundId, _) = await SeedAsync(status: RefundStatuses.Pending);
        using var _ = db;

        var result = await Controller(db, "uid-finance", "finance@tc.com")
            .Process(refundId, new RefundActionRequest { RefundReference = "TRACE-1" });

        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.Contains("cannot move to Processing", conflict.Value!.ToString());
        Assert.Equal(RefundStatuses.Pending, (await db.BookingRefunds.FirstAsync()).Status);
    }

    [Fact]
    public async Task A_failure_needs_a_reason_and_then_keeps_the_money_owed()
    {
        var (db, refundId, _) = await SeedAsync(status: RefundStatuses.Processing);
        using var _ = db;

        Assert.IsType<BadRequestObjectResult>(
            await Controller(db, "uid-finance", "finance@tc.com").Fail(refundId, new RefundActionRequest { Reason = "  " }));

        var body = Body(await Controller(db, "uid-finance", "finance@tc.com")
            .Fail(refundId, new RefundActionRequest { Reason = "GCash account is closed." }));

        Assert.Equal(RefundStatuses.Failed, body.GetProperty("refund").GetProperty("status").GetString());
        Assert.Equal(BookingStatusValues.RefundFailed, body.GetProperty("bookingStatus").GetString());
        Assert.Equal("GCash account is closed.", body.GetProperty("failureReason").GetString());
        Assert.False((await db.Bookings.FirstAsync()).Paid);
    }

    [Fact]
    public async Task A_failed_refund_can_be_retried()
    {
        var (db, refundId, _) = await SeedAsync(status: RefundStatuses.Failed);
        using var _ = db;

        var body = Body(await Controller(db, "uid-finance", "finance@tc.com").Retry(refundId, null));

        Assert.Equal(RefundStatuses.Processing, body.GetProperty("refund").GetProperty("status").GetString());
    }

    [Fact]
    public async Task An_unknown_refund_is_a_not_found()
    {
        var (db, _, _) = await SeedAsync();
        using var _ = db;

        var controller = Controller(db, "uid-finance", "finance@tc.com");

        Assert.IsType<NotFoundObjectResult>(await controller.Detail(9999));
        Assert.IsType<NotFoundObjectResult>(await controller.Release(9999, null));
    }

    [Fact]
    public async Task The_detail_view_exposes_the_legal_next_moves_so_the_ui_cannot_offer_an_illegal_one()
    {
        var (db, refundId, _) = await SeedAsync();
        using var _ = db;

        var body = Body(await Controller(db, "uid-finance", "finance@tc.com").Detail(refundId));

        Assert.Equal("RFND-2026-000001", body.GetProperty("refund").GetProperty("reference").GetString());
        Assert.Equal("TC-2026-0001", body.GetProperty("booking").GetProperty("referenceNumber").GetString());
        Assert.Equal("pay_abc123", body.GetProperty("payment").GetProperty("referenceId").GetString());
        Assert.True(body.GetProperty("canProcess").GetBoolean());

        var allowed = body.GetProperty("allowedTransitions").EnumerateArray().Select(e => e.GetString()).ToArray();
        Assert.Contains(RefundStatuses.Approved, allowed);
        Assert.DoesNotContain(RefundStatuses.Completed, allowed);
    }

    [Fact]
    public async Task A_status_the_queue_does_not_understand_is_a_bad_request()
    {
        var (db, _, _) = await SeedAsync();
        using var _ = db;

        var result = await Controller(db, "uid-finance", "finance@tc.com").List("Halfway", null, null, null);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task The_legacy_payments_refund_can_no_longer_pay_a_cancelled_booking()
    {
        var (db, refundId, _) = await SeedAsync();
        using var _ = db;

        var result = await Payments(db, "uid-finance", "finance@tc.com").RefundToWallet(1);
        var body = Body(result);

        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal(refundId, body.GetProperty("refundId").GetInt32());
        Assert.Contains("RFND-2026-000001", body.GetProperty("message").GetString());

        // The shortcut moved nothing: the payment and booking are untouched and
        // the real refund is still waiting in the queue.
        Assert.Equal("Paid", (await db.Payments.FirstAsync()).Status);
        Assert.Equal(BookingStatusValues.Cancelled, (await db.Bookings.FirstAsync()).Status);
        Assert.Equal(RefundStatuses.Pending, (await db.BookingRefunds.FirstAsync()).Status);
        Assert.NotNull(conflict.Value);
    }

    [Fact]
    public async Task A_role_without_refund_permission_cannot_use_the_payments_shortcut_either()
    {
        var (db, _, _) = await SeedAsync(financeCanProcess: false);
        using var _ = db;

        Assert.IsType<ForbidResult>(await Payments(db, "uid-finance", "finance@tc.com").RefundToWallet(1));
        Assert.Equal("Paid", (await db.Payments.FirstAsync()).Status);
    }
}
