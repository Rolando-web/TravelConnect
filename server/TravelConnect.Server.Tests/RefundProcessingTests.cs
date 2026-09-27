using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;
using Xunit;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Unit Test Phase 5 — the finance payout queue. An approved cancellation has
/// only promised money; these tests pin down what happens when finance acts on it:
/// the lifecycle can only move forward, a completed cash refund must carry a
/// provider reference, a failure keeps the money owed, a partial settlement never
/// marks the whole payment refunded, and only finance roles can touch it.
/// </summary>
public class RefundProcessingTests
{
    private static readonly DateTime Now = new(2026, 6, 12, 9, 0, 0, DateTimeKind.Utc);

    private static StaffActor Staff(string role) => new(
        new SystemUser { Email = $"{role.Replace(" ", "-").ToLower()}@tc.com", Role = role, Status = "Active" },
        $"{role.Replace(" ", "-").ToLower()}@tc.com",
        role);

    /// <summary>An approved cancellation that has queued a cash refund of 6525.</summary>
    private static async Task<TravelConnectDbContext> ApprovedDbAsync(
        decimal refundAmount = 6525m,
        string method = "gcash",
        decimal paymentAmount = 10000m)
    {
        var db = TestDb.Create();
        var booking = CancellationFixtures.Booking(departure: Now.AddHours(96), total: paymentAmount);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        db.Payments.Add(new Payment
        {
            ReferenceId = "pay_abc123",
            BookingId = booking.Id,
            CustomerName = booking.CustomerName,
            PackageName = booking.PackageName,
            Amount = paymentAmount,
            Method = "gcash",
            Status = "Paid",
            PaymentDate = "2026-06-01",
        });

        var cancellation = CancellationFixtures.Cancellation(booking, CancellationStatuses.Approved);
        cancellation.DecidedAt = Now.AddHours(-3);
        cancellation.ApprovedAt = Now.AddHours(-3);
        cancellation.ApprovedBy = "agency@tc.com";
        cancellation.Resolution = method == "travel-credit" ? RefundResolutions.TravelCredit : RefundResolutions.Cash;
        cancellation.RefundAmount = refundAmount;
        db.BookingCancellations.Add(cancellation);

        var refund = CancellationFixtures.Refund(cancellation);
        refund.Method = method;
        refund.Amount = refundAmount;
        refund.CalculatedAmount = refundAmount;
        refund.RequestedBy = "agency@tc.com";
        db.BookingRefunds.Add(refund);

        booking.Status = BookingStatusValues.Cancelled;
        booking.CancellationStatus = CancellationStatuses.Approved;
        booking.Paid = false;
        booking.RefundAmount = refundAmount;
        booking.RefundReference = refund.Reference;
        booking.ActiveCancellationId = cancellation.Id;
        booking.CancelledAt = Now.AddHours(-3);

        await db.SaveChangesAsync();
        return db;
    }

    private static RefundProcessingService Refunds(TravelConnectDbContext db) => new(db);

    private static async Task<BookingRefund> RefundAsync(TravelConnectDbContext db) =>
        await db.BookingRefunds.FirstAsync();

    private static async Task<Booking> BookingAsync(TravelConnectDbContext db) =>
        await db.Bookings.FirstAsync();

    // ── the happy path moves money through every state ──────────────

    [Fact]
    public async Task A_released_refund_is_linked_to_the_payment_that_took_the_money()
    {
        using var db = await ApprovedDbAsync();
        var id = (await RefundAsync(db)).Id;

        var result = await Refunds(db).ReleaseAsync(id, Staff(StaffRoles.FinanceStaff), "Releasing with the batch.", Now);

        Assert.Equal(RefundStatuses.Approved, result.Refund.Status);
        Assert.Equal("finance-staff@tc.com", result.Refund.ApprovedBy);
        Assert.Equal(Now, result.Refund.ApprovedAt);
        Assert.Equal("pay_abc123", (await db.Payments.FirstAsync()).ReferenceId);
        Assert.NotNull(result.Refund.PaymentId);
        Assert.Contains("Releasing with the batch.", result.Refund.Notes);
    }

    [Fact]
    public async Task The_whole_lifecycle_walks_pending_to_completed_and_mirrors_the_booking()
    {
        using var db = await ApprovedDbAsync(refundAmount: 10000m, paymentAmount: 10000m);
        var service = Refunds(db);
        var id = (await RefundAsync(db)).Id;
        var finance = Staff(StaffRoles.FinanceStaff);

        Assert.Equal(RefundStatuses.Pending, (await RefundAsync(db)).Status);

        await service.ReleaseAsync(id, finance, at: Now);
        Assert.Equal(BookingStatusValues.RefundPending, (await BookingAsync(db)).Status);
        Assert.Equal(CancellationStatuses.RefundPending, (await db.BookingCancellations.FirstAsync()).Status);
        Assert.Equal(RefundStatuses.Approved, (await BookingAsync(db)).RefundStatus);

        await service.StartAsync(id, finance, "TRACE-77123", at: Now);
        Assert.Equal(RefundStatuses.Processing, (await RefundAsync(db)).Status);
        Assert.Equal("TRACE-77123", (await RefundAsync(db)).RefundReference);
        Assert.Equal(BookingStatusValues.RefundProcessing, (await BookingAsync(db)).Status);

        await service.CompleteAsync(id, finance, at: Now);

        var refund = await RefundAsync(db);
        var booking = await BookingAsync(db);
        Assert.Equal(RefundStatuses.Completed, refund.Status);
        Assert.Equal(Now, refund.CompletedAt);
        Assert.Equal(BookingStatusValues.Refunded, booking.Status);
        Assert.Equal(CancellationStatuses.Refunded, (await db.BookingCancellations.FirstAsync()).Status);
        Assert.False(booking.Paid);
        Assert.Equal(10000m, booking.RefundAmount);

        // A refund that covers the whole payment closes the payment that took the money.
        Assert.Equal("Refunded", (await db.Payments.FirstAsync()).Status);
    }

    [Fact]
    public async Task A_partial_refund_never_marks_the_whole_payment_refunded()
    {
        using var db = await ApprovedDbAsync(refundAmount: 6525m, paymentAmount: 10000m);
        var service = Refunds(db);
        var id = (await RefundAsync(db)).Id;
        var finance = Staff(StaffRoles.FinanceStaff);

        await service.ReleaseAsync(id, finance, at: Now);
        await service.StartAsync(id, finance, "TRACE-1", at: Now);
        var result = await service.CompleteAsync(id, finance, at: Now);

        Assert.Equal(RefundStatuses.Completed, result.Refund.Status);
        Assert.Equal("Paid", (await db.Payments.FirstAsync()).Status);
        Assert.Contains("Partial settlement", result.Refund.Notes);
    }

    // ── the guard rails that cost money if they break ───────────────

    [Fact]
    public async Task A_cash_refund_cannot_be_completed_without_a_provider_reference()
    {
        using var db = await ApprovedDbAsync();
        var service = Refunds(db);
        var id = (await RefundAsync(db)).Id;
        var finance = Staff(StaffRoles.FinanceStaff);

        await service.ReleaseAsync(id, finance, at: Now);
        await service.StartAsync(id, finance, at: Now);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CompleteAsync(id, finance, at: Now));

        // The refused attempt left the refund exactly where it was.
        Assert.Equal(RefundStatuses.Processing, (await RefundAsync(db)).Status);
        Assert.Null((await RefundAsync(db)).CompletedAt);
    }

    [Fact]
    public async Task A_travel_credit_completes_without_a_provider_reference()
    {
        using var db = await ApprovedDbAsync(refundAmount: 7900m, method: "travel-credit");
        var service = Refunds(db);
        var id = (await RefundAsync(db)).Id;
        var finance = Staff(StaffRoles.FinanceStaff);

        await service.ReleaseAsync(id, finance, at: Now);
        var result = await service.CompleteAsync(id, finance, at: Now);

        Assert.Equal(RefundStatuses.Completed, result.Refund.Status);
        Assert.Contains("Travel credit", result.Message);
    }

    [Fact]
    public async Task A_pending_refund_cannot_be_skipped_straight_to_payout()
    {
        using var db = await ApprovedDbAsync();
        var id = (await RefundAsync(db)).Id;
        Assert.Equal(RefundStatuses.Pending, (await RefundAsync(db)).Status);

        var service = Refunds(db);
        var finance = Staff(StaffRoles.FinanceStaff);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.StartAsync(id, finance, "TRACE-9", at: Now));
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CompleteAsync(id, finance, "TRACE-9", at: Now));

        Assert.Equal(RefundStatuses.Pending, (await RefundAsync(db)).Status);
    }

    [Fact]
    public async Task A_refund_cannot_be_released_twice()
    {
        using var db = await ApprovedDbAsync();
        var service = Refunds(db);
        var id = (await RefundAsync(db)).Id;
        var finance = Staff(StaffRoles.FinanceStaff);

        await service.ReleaseAsync(id, finance, at: Now);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ReleaseAsync(id, finance, at: Now));
        Assert.Equal(RefundStatuses.Approved, (await RefundAsync(db)).Status);
    }

    [Fact]
    public async Task A_completed_refund_is_final()
    {
        using var db = await ApprovedDbAsync();
        var service = Refunds(db);
        var id = (await RefundAsync(db)).Id;
        var finance = Staff(StaffRoles.FinanceStaff);

        await service.ReleaseAsync(id, finance, at: Now);
        await service.CompleteAsync(id, finance, "TRACE-1", at: Now);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.StartAsync(id, finance, at: Now));
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CompleteAsync(id, finance, at: Now));
        Assert.Equal(RefundStatuses.Completed, (await RefundAsync(db)).Status);
    }

    // ── failure and retry keep the money owed ───────────────────────

    [Fact]
    public async Task A_failed_payout_keeps_the_money_owed_and_says_why()
    {
        using var db = await ApprovedDbAsync();
        var service = Refunds(db);
        var id = (await RefundAsync(db)).Id;
        var finance = Staff(StaffRoles.FinanceStaff);

        await service.ReleaseAsync(id, finance, at: Now);
        var result = await service.FailAsync(id, finance, "GCash account is closed.", at: Now);

        Assert.Equal(RefundStatuses.Failed, result.Refund.Status);
        Assert.Equal("GCash account is closed.", result.Refund.FailureReason);
        Assert.Equal(BookingStatusValues.RefundFailed, (await BookingAsync(db)).Status);
        Assert.Equal(CancellationStatuses.RefundFailed, (await db.BookingCancellations.FirstAsync()).Status);
        Assert.False((await BookingAsync(db)).Paid);
        Assert.Equal("Paid", (await db.Payments.FirstAsync()).Status);
    }

    [Fact]
    public async Task A_failure_needs_a_reason_finance_can_act_on()
    {
        using var db = await ApprovedDbAsync();
        var id = (await RefundAsync(db)).Id;
        var finance = Staff(StaffRoles.FinanceStaff);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            Refunds(db).FailAsync(id, finance, "   ", at: Now));

        Assert.Equal(RefundStatuses.Pending, (await RefundAsync(db)).Status);
    }

    [Fact]
    public async Task A_failed_payout_can_be_retried_and_the_old_reason_is_kept_in_the_trail()
    {
        using var db = await ApprovedDbAsync();
        var service = Refunds(db);
        var id = (await RefundAsync(db)).Id;
        var finance = Staff(StaffRoles.FinanceStaff);

        await service.ReleaseAsync(id, finance, at: Now);
        await service.StartAsync(id, finance, "TRACE-1", at: Now);
        await service.FailAsync(id, finance, "Provider timeout.", at: Now);

        var result = await service.RetryAsync(id, finance, at: Now);

        Assert.Equal(RefundStatuses.Processing, result.Refund.Status);
        Assert.Equal(string.Empty, result.Refund.FailureReason);
        Assert.Equal(BookingStatusValues.RefundProcessing, (await BookingAsync(db)).Status);
        Assert.Contains("after: Provider timeout.", result.Refund.Notes);
    }

    [Fact]
    public async Task A_voided_refund_can_never_be_paid()
    {
        using var db = await ApprovedDbAsync();
        var refund = await RefundAsync(db);
        refund.Status = RefundStatuses.Voided;
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Refunds(db).ReleaseAsync(refund.Id, Staff(StaffRoles.FinanceStaff), at: Now));

        Assert.Equal(RefundStatuses.Voided, (await RefundAsync(db)).Status);
    }

    [Fact]
    public async Task A_refund_whose_cancellation_was_rejected_stays_voided()
    {
        using var db = await ApprovedDbAsync();
        var cancellation = await db.BookingCancellations.FirstAsync();
        cancellation.Status = CancellationStatuses.Rejected;
        await db.SaveChangesAsync();

        var id = (await RefundAsync(db)).Id;
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Refunds(db).ReleaseAsync(id, Staff(StaffRoles.FinanceStaff), at: Now));
    }

    // ── roles ───────────────────────────────────────────────────────

    [Theory]
    [InlineData("Agency Staff")]
    [InlineData("Customer")]
    public async Task Only_finance_roles_may_move_money(string role)
    {
        using var db = await ApprovedDbAsync();
        var id = (await RefundAsync(db)).Id;

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            Refunds(db).ReleaseAsync(id, Staff(role), at: Now));

        Assert.Equal(RefundStatuses.Pending, (await RefundAsync(db)).Status);
    }

    [Theory]
    [InlineData(StaffRoles.FinanceStaff)]
    [InlineData(StaffRoles.SuperAdmin)]
    [InlineData(StaffRoles.AgencyAdmin)]
    public async Task Every_finance_role_can_run_the_queue(string role)
    {
        using var db = await ApprovedDbAsync();
        var id = (await RefundAsync(db)).Id;

        var result = await Refunds(db).ReleaseAsync(id, Staff(role), at: Now);

        Assert.Equal(RefundStatuses.Approved, result.Refund.Status);
    }

    [Fact]
    public async Task An_inactive_user_cannot_move_money_even_with_the_right_role_name()
    {
        using var db = await ApprovedDbAsync();
        var id = (await RefundAsync(db)).Id;
        var suspended = new StaffActor(
            new SystemUser { Email = "suspended@tc.com", Role = StaffRoles.FinanceStaff, Status = "Suspended" },
            "suspended@tc.com",
            "Suspended");

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            Refunds(db).ReleaseAsync(id, suspended, at: Now));
    }

    // ── the queue itself ────────────────────────────────────────────

    [Fact]
    public async Task The_queue_defaults_to_the_money_still_to_be_moved()
    {
        using var db = await ApprovedDbAsync();
        var service = Refunds(db);
        var id = (await RefundAsync(db)).Id;

        var pending = await service.ListAsync(null, null);
        Assert.Equal(1, pending.Total);
        Assert.Equal(RefundStatuses.Pending, pending.Items[0].Status);

        await service.ReleaseAsync(id, Staff(StaffRoles.FinanceStaff), at: Now);
        Assert.Equal(1, (await service.ListAsync(null, null)).Total);

        await service.CompleteAsync(id, Staff(StaffRoles.FinanceStaff), "TRACE-1", at: Now);

        // A settled refund leaves the work view but is still auditable.
        Assert.Equal(0, (await service.ListAsync(null, null)).Total);
        Assert.Equal(1, (await service.ListAsync(RefundStatuses.Completed, null)).Total);
    }

    [Fact]
    public async Task The_queue_shows_the_oldest_promise_first_and_can_be_searched()
    {
        using var db = TestDb.Create();
        var booking = CancellationFixtures.Booking(departure: Now.AddDays(10), total: 10000m);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var cancellation = CancellationFixtures.Cancellation(booking, CancellationStatuses.Approved);
        db.BookingCancellations.Add(cancellation);
        await db.SaveChangesAsync();

        var emails = new[] { "maria@tc.com", "juan@tc.com" };
        for (var index = 0; index < emails.Length; index++)
        {
            var extra = CancellationFixtures.Cancellation(booking, CancellationStatuses.Approved);
            extra.Reference = $"CANC-2026-90000{index}";
            extra.CustomerName = emails[index].Split('@')[0];
            extra.CustomerEmail = emails[index];
            extra.RequestedAt = Now.AddHours(-(index + 1));
            db.BookingCancellations.Add(extra);
            await db.SaveChangesAsync();

            var refund = CancellationFixtures.Refund(extra);
            refund.Reference = $"RFND-2026-90000{index}";
            // FIFO is by when the promise was made, so the test pins the clock
            // instead of relying on how fast the rows happened to be inserted.
            refund.CreatedAt = Now.AddHours(-(index + 1));
            db.BookingRefunds.Add(refund);
        }
        await db.SaveChangesAsync();

        var page = await Refunds(db).ListAsync(null, null);

        Assert.Equal(2, page.Total);
        Assert.Equal("RFND-2026-900001", page.Items[0].Reference); // oldest promise first
        Assert.Equal("RFND-2026-900000", page.Items[1].Reference);

        var byCustomer = await Refunds(db).ListAsync(null, "maria");
        Assert.Equal(1, byCustomer.Total);
        Assert.Equal("maria@tc.com", byCustomer.Items[0].Cancellation?.CustomerEmail);

        Assert.Equal(0, (await Refunds(db).ListAsync(null, "nobody@tc.com")).Total);
    }

    [Fact]
    public async Task The_queue_rejects_a_status_it_does_not_understand()
    {
        using var db = await ApprovedDbAsync();

        await Assert.ThrowsAsync<ArgumentException>(() => Refunds(db).ListAsync("Halfway", null));
    }

    [Fact]
    public async Task The_queue_normalises_pagination_instead_of_echoing_nonsense()
    {
        using var db = await ApprovedDbAsync();
        var service = Refunds(db);

        var capped = await service.ListAsync(null, null, page: 1, pageSize: 5000);
        Assert.Equal(RefundProcessingService.MaxPageSize, capped.PageSize);

        var nonsense = await service.ListAsync(null, null, page: 0, pageSize: -5);
        Assert.Equal(1, nonsense.Page);
        Assert.Equal(25, nonsense.PageSize);
    }

    [Fact]
    public async Task The_detail_view_carries_the_booking_the_payment_and_the_legal_next_moves()
    {
        using var db = await ApprovedDbAsync();
        var service = Refunds(db);
        var id = (await RefundAsync(db)).Id;

        var pending = await service.GetAsync(id);
        Assert.NotNull(pending);
        Assert.Equal(BookingStatusValues.Cancelled, pending!.Booking?.Status);
        Assert.Equal(RefundResolutions.Cash, pending.Cancellation?.Resolution);
        Assert.Equal([RefundStatuses.Approved, RefundStatuses.Rejected, RefundStatuses.Voided], RefundStatuses.AllowedTransitions(pending.Status));

        await service.ReleaseAsync(id, Staff(StaffRoles.FinanceStaff), at: Now);
        var released = await service.GetAsync(id);
        Assert.NotNull(released?.Payment);
        Assert.Contains(RefundStatuses.Processing, RefundStatuses.AllowedTransitions(released!.Status));

        Assert.Null(await service.GetAsync(9999));
    }
}
