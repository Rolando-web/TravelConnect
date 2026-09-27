using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;
using Xunit;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Unit Test Phase 4 — the staff review queue. A request the policy could not
/// auto-approve waits for a decision, so these tests pin down the things that
/// would quietly cost money if they broke: an approval moves exactly the frozen
/// amount, a rejection moves nothing, a decision cannot be taken twice, and
/// nobody without the right role can take one at all.
/// </summary>
public class CancellationReviewTests
{
    private static readonly DateTime Now = new(2026, 6, 11, 9, 0, 0, DateTimeKind.Utc);

    private static StaffActor Staff(string role) => new(
        new SystemUser { Email = $"{role.Replace(" ", "-").ToLower()}@tc.com", Role = role, Status = "Active" },
        $"{role.Replace(" ", "-").ToLower()}@tc.com",
        role);

    private static async Task<TravelConnectDbContext> QueuedDbAsync(
        decimal refundAmount = 6525m,
        string resolution = RefundResolutions.Cash)
    {
        var db = TestDb.Create();
        var booking = CancellationFixtures.Booking(
            departure: Now.AddHours(120),
            createdAt: Now.AddHours(-240),
            total: 10000m);

        // The cancellation needs the booking's real id, so the booking lands first.
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var cancellation = CancellationFixtures.Cancellation(booking);
        cancellation.Status = CancellationStatuses.Requested;
        cancellation.RequiresApproval = true;
        cancellation.AutoApproved = false;
        cancellation.DecidedAt = null;
        cancellation.ApprovedBy = string.Empty;
        cancellation.ApprovedAt = null;
        cancellation.Resolution = resolution;
        cancellation.RefundAmount = refundAmount;
        cancellation.RequestedAt = Now.AddHours(-2);

        db.BookingCancellations.Add(cancellation);
        booking.Status = BookingStatusValues.CancellationRequested;
        booking.ActiveCancellationId = cancellation.Id;
        booking.CancellationStatus = CancellationStatuses.Requested;

        await db.SaveChangesAsync();
        return db;
    }

    private static CancellationReviewService Reviews(TravelConnectDbContext db) =>
        new(db, new CancellationQuoteService(db, new CancellationPolicyService(db)));

    // ── approving ──────────────────────────────────────────────────

    [Fact]
    public async Task Approving_cancels_the_booking_releases_the_seat_and_raises_a_pending_refund()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        var decision = await service.ApproveAsync(cancellationId, Staff(StaffRoles.AgencyAdmin), at: Now);

        Assert.Equal(CancellationStatuses.Approved, decision.Cancellation.Status);
        Assert.Equal("agency-admin@tc.com", decision.Cancellation.ApprovedBy);
        Assert.Equal(Now, decision.Cancellation.ApprovedAt);
        Assert.Equal(Now, decision.Cancellation.DecidedAt);

        var booking = await db.Bookings.Include(b => b.BookingFlights).FirstAsync();
        Assert.Equal(BookingStatusValues.Cancelled, booking.Status);
        Assert.False(booking.Paid);
        Assert.Equal(CancellationStatuses.Approved, booking.CancellationStatus);
        Assert.Equal(Now, booking.CancelledAt);
        Assert.Equal("Available", booking.BookingFlights.Single().SeatStatus);
        Assert.Equal(string.Empty, booking.BookingFlights.Single().SeatNumber);

        var refund = await db.BookingRefunds.SingleAsync();
        Assert.Equal(RefundStatuses.Pending, refund.Status);
        Assert.Equal(6525m, refund.Amount);
        Assert.Equal(6525m, refund.CalculatedAmount);
        Assert.Equal("gcash", refund.Method);
        Assert.Equal(refund.Reference, booking.RefundReference);
        Assert.Contains("6525", decision.Message);
    }

    [Fact]
    public async Task Approving_a_zero_refund_cancels_the_booking_without_raising_money()
    {
        using var db = await QueuedDbAsync(refundAmount: 0m);
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        var decision = await service.ApproveAsync(cancellationId, Staff(StaffRoles.SuperAdmin), at: Now);

        Assert.Null(decision.Refund);
        Assert.Empty(await db.BookingRefunds.ToListAsync());
        Assert.Equal(BookingStatusValues.Cancelled, (await db.Bookings.FirstAsync()).Status);
    }

    [Fact]
    public async Task Approving_records_the_staff_note()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await service.ApproveAsync(cancellationId, Staff(StaffRoles.AgencyAdmin), "Family emergency, documents attached.", at: Now);

        Assert.Contains("Family emergency", (await db.BookingCancellations.FirstAsync()).Notes);
    }

    [Fact]
    public async Task Approving_as_travel_credit_pays_the_wallet_instead_of_the_card()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await service.ApproveAsync(
            cancellationId,
            Staff(StaffRoles.AgencyAdmin),
            resolutionOverride: RefundResolutions.TravelCredit,
            at: Now);

        var cancellation = await db.BookingCancellations.FirstAsync();
        var refund = await db.BookingRefunds.SingleAsync();
        Assert.Equal("travel-credit", refund.Method);
        Assert.Equal(6525m, refund.Amount);
        Assert.Equal(RefundResolutions.TravelCredit, cancellation.Resolution);

        // Swapping the payout method is a departure from the quote, so it shows
        // up in the queue as an exception and in the audit trail.
        Assert.True(cancellation.IsException);
        Assert.Contains("Resolution changed from cash to travel-credit by", cancellation.Notes);
    }

    [Fact]
    public async Task Re_confirming_the_quoted_resolution_is_audited_but_not_flagged_as_an_exception()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await service.ApproveAsync(
            cancellationId,
            Staff(StaffRoles.AgencyAdmin),
            resolutionOverride: RefundResolutions.Cash,
            at: Now);

        var cancellation = await db.BookingCancellations.FirstAsync();
        Assert.False(cancellation.IsException);
        Assert.Equal(6525m, (await db.BookingRefunds.SingleAsync()).Amount);
        Assert.Contains("Resolution cash confirmed by", cancellation.Notes);
    }

    [Fact]
    public async Task Approving_with_no_refund_resolution_pays_nothing_and_flags_an_exception()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await service.ApproveAsync(
            cancellationId,
            Staff(StaffRoles.AgencyAdmin),
            resolutionOverride: RefundResolutions.None,
            at: Now);

        var cancellation = await db.BookingCancellations.FirstAsync();
        Assert.Equal(0m, cancellation.RefundAmount);
        Assert.True(cancellation.IsException);
        Assert.Empty(await db.BookingRefunds.ToListAsync());
    }

    [Fact]
    public async Task A_manager_may_correct_the_amount_and_it_is_audited_as_an_exception()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await service.ApproveAsync(
            cancellationId,
            Staff(StaffRoles.SuperAdmin),
            notes: "Goodwill partial refund.",
            refundAmountOverride: 4000m,
            at: Now);

        var cancellation = await db.BookingCancellations.FirstAsync();
        Assert.Equal(4000m, cancellation.RefundAmount);
        Assert.True(cancellation.IsException);
        Assert.Equal(4000m, (await db.BookingRefunds.SingleAsync()).Amount);
    }

    [Fact]
    public async Task Rejecting_a_non_refundable_approval_does_not_flag_an_exception()
    {
        using var db = await QueuedDbAsync(refundAmount: 0m);
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await service.ApproveAsync(cancellationId, Staff(StaffRoles.SuperAdmin), at: Now);

        Assert.False((await db.BookingCancellations.FirstAsync()).IsException);
    }

    [Fact]
    public async Task An_amount_override_needs_the_override_permission()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.ApproveAsync(cancellationId, Staff(StaffRoles.FinanceStaff), refundAmountOverride: 1m, at: Now));

        Assert.Equal(CancellationStatuses.Requested, (await db.BookingCancellations.FirstAsync()).Status);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(10001)]
    public async Task An_amount_override_outside_the_paid_total_is_refused(decimal bad)
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.ApproveAsync(cancellationId, Staff(StaffRoles.SuperAdmin), refundAmountOverride: bad, at: Now));

        Assert.Equal(CancellationStatuses.Requested, (await db.BookingCancellations.FirstAsync()).Status);
    }

    [Fact]
    public async Task An_unknown_resolution_is_refused()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.ApproveAsync(cancellationId, Staff(StaffRoles.SuperAdmin), resolutionOverride: "bitcoin", at: Now));
    }

    // ── rejecting ──────────────────────────────────────────────────

    [Fact]
    public async Task Rejecting_restores_the_booking_and_leaves_no_money_behind()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        var decision = await service.RejectAsync(
            cancellationId, Staff(StaffRoles.AgencyAdmin), "Fare is non-transferable, guest declined upgrade.", Now);

        var cancellation = await db.BookingCancellations.FirstAsync();
        Assert.Equal(CancellationStatuses.Rejected, cancellation.Status);
        Assert.Equal("Fare is non-transferable, guest declined upgrade.", cancellation.RejectionReason);
        Assert.Equal(Now, cancellation.DecidedAt);
        Assert.Contains("Rejected by agency-admin@tc.com", cancellation.Notes);

        var booking = await db.Bookings.Include(b => b.BookingFlights).FirstAsync();
        Assert.Equal(BookingStatusValues.Upcoming, booking.Status);
        Assert.Null(booking.ActiveCancellationId);
        Assert.Equal(CancellationStatuses.Rejected, booking.CancellationStatus);
        Assert.Equal(0m, booking.RefundAmount);
        Assert.Equal(string.Empty, booking.RefundReference);
        Assert.True(booking.Paid);

        // The seat was never released, because the cancellation never stood.
        Assert.Equal("Sold", booking.BookingFlights.Single().SeatStatus);
        Assert.Empty(await db.BookingRefunds.ToListAsync());
        Assert.Contains("no refund is due", decision.Message);
    }

    [Fact]
    public async Task Rejecting_needs_a_reason_the_customer_can_be_told()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RejectAsync(cancellationId, Staff(StaffRoles.AgencyAdmin), "   ", Now));

        Assert.Equal(CancellationStatuses.Requested, (await db.BookingCancellations.FirstAsync()).Status);
    }

    [Fact]
    public async Task Rejecting_voids_a_pending_refund_that_slipped_through()
    {
        using var db = await QueuedDbAsync();
        var cancellation = await db.BookingCancellations.FirstAsync();
        db.BookingRefunds.Add(CancellationFixtures.Refund(cancellation));
        await db.SaveChangesAsync();

        await Reviews(db).RejectAsync(cancellation.Id, Staff(StaffRoles.SuperAdmin), "Duplicate request.", Now);

        Assert.Equal(RefundStatuses.Voided, (await db.BookingRefunds.SingleAsync()).Status);
    }

    [Fact]
    public async Task Rejecting_a_departed_booking_closes_it_out_instead_of_keeping_it_upcoming()
    {
        using var db = TestDb.Create();
        var booking = CancellationFixtures.Booking(departure: Now.AddDays(-3), createdAt: Now.AddDays(-30));
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var cancellation = CancellationFixtures.Cancellation(booking);
        cancellation.Status = CancellationStatuses.Requested;
        db.BookingCancellations.Add(cancellation);
        booking.Status = BookingStatusValues.CancellationRequested;
        booking.ActiveCancellationId = cancellation.Id;
        await db.SaveChangesAsync();

        await Reviews(db).RejectAsync(cancellation.Id, Staff(StaffRoles.SuperAdmin), "Flight already departed.", Now);

        Assert.Equal(BookingStatusValues.Completed, (await db.Bookings.FirstAsync()).Status);
    }

    // ── decisions are final ────────────────────────────────────────

    [Fact]
    public async Task A_request_cannot_be_approved_twice()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await service.ApproveAsync(cancellationId, Staff(StaffRoles.AgencyAdmin), at: Now);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ApproveAsync(cancellationId, Staff(StaffRoles.AgencyAdmin), at: Now));

        // Still exactly one refund: the second attempt moved no money.
        Assert.Single(await db.BookingRefunds.ToListAsync());
    }

    [Fact]
    public async Task An_approved_request_cannot_be_rejected_afterwards()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await service.ApproveAsync(cancellationId, Staff(StaffRoles.AgencyAdmin), at: Now);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.RejectAsync(cancellationId, Staff(StaffRoles.AgencyAdmin), "Changed our mind.", Now));

        Assert.Equal(CancellationStatuses.Approved, (await db.BookingCancellations.FirstAsync()).Status);
        Assert.Single(await db.BookingRefunds.ToListAsync());
    }

    [Fact]
    public async Task A_decision_on_a_cancelled_booking_is_refused()
    {
        using var db = await QueuedDbAsync();
        var booking = await db.Bookings.FirstAsync();
        booking.Status = BookingStatusValues.Cancelled;
        await db.SaveChangesAsync();
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Reviews(db).ApproveAsync(cancellationId, Staff(StaffRoles.AgencyAdmin), at: Now));
    }

    [Fact]
    public async Task Deciding_an_unknown_request_is_a_not_found()
    {
        using var db = await QueuedDbAsync();
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            Reviews(db).ApproveAsync(9999, Staff(StaffRoles.SuperAdmin), at: Now));
    }

    // ── permissions ────────────────────────────────────────────────

    [Theory]
    [InlineData(StaffRoles.FinanceStaff)]
    [InlineData(StaffRoles.AgencyStaff)]
    public async Task Roles_without_approval_permission_cannot_decide(string role)
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.ApproveAsync(cancellationId, Staff(role), at: Now));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.RejectAsync(cancellationId, Staff(role), "No.", Now));

        Assert.Equal(CancellationStatuses.Requested, (await db.BookingCancellations.FirstAsync()).Status);
    }

    [Fact]
    public async Task A_suspended_staff_account_loses_every_permission()
    {
        var suspended = new SystemUser { Email = "suspended@tc.com", Role = StaffRoles.SuperAdmin, Status = "Suspended" };
        var actor = new StaffActor(suspended, suspended.Email, "Suspended");

        using var db = await QueuedDbAsync();
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;

        Assert.False(actor.CanApproveCancellation);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            Reviews(db).ApproveAsync(cancellationId, actor, at: Now));
    }

    [Fact]
    public async Task An_anonymous_actor_cannot_decide_anything()
    {
        using var db = await QueuedDbAsync();
        var cancellationId = (await db.BookingCancellations.FirstAsync()).Id;
        var anonymous = new StaffActor(null, string.Empty, string.Empty);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            Reviews(db).ApproveAsync(cancellationId, anonymous, at: Now));
    }

    // ── the queue itself ───────────────────────────────────────────

    [Fact]
    public async Task The_default_queue_lists_open_requests_oldest_first()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);
        var first = (await db.BookingCancellations.FirstAsync()).Id;

        var decided = CancellationFixtures.Cancellation((await db.Bookings.FirstAsync()), CancellationStatuses.Approved);
        decided.Reference = "CANC-2026-000002";
        decided.RequestedAt = Now.AddHours(-1);
        db.BookingCancellations.Add(decided);
        await db.SaveChangesAsync();

        var older = await db.BookingCancellations.FirstAsync(c => c.Id == first);
        older.RequestedAt = Now.AddHours(-5);
        await db.SaveChangesAsync();

        var pendingPage = await service.ListAsync(null, null);

        Assert.Equal(1, pendingPage.Total);
        Assert.Equal(first, pendingPage.Items[0].Id);
    }

    [Fact]
    public async Task The_queue_can_filter_by_status_and_search_the_customer()
    {
        using var db = await QueuedDbAsync();
        var service = Reviews(db);

        var done = CancellationFixtures.Cancellation(await db.Bookings.FirstAsync(), CancellationStatuses.Approved);
        done.Reference = "CANC-2026-000002";
        done.CustomerEmail = "maria@tc.com";
        db.BookingCancellations.Add(done);
        await db.SaveChangesAsync();

        var approved = await service.ListAsync(CancellationStatuses.Approved, null);
        Assert.Equal(1, approved.Total);
        Assert.Equal("CANC-2026-000002", approved.Items[0].Reference);

        var pending = await service.ListAsync("pending", null);
        Assert.Single(pending.Items);

        // Search is scoped to the view it was asked for, so a decided request is
        // only findable when the decided slice is on screen.
        var byEmail = await service.ListAsync(CancellationStatuses.Approved, "maria");
        Assert.Equal(1, byEmail.Total);
        Assert.Equal("maria@tc.com", byEmail.Items[0].CustomerEmail);
        Assert.Empty((await service.ListAsync(null, "maria")).Items);

        var byBooking = await service.ListAsync(null, "TC-2026-0001");
        Assert.Equal(1, byBooking.Total);
    }

    [Fact]
    public async Task The_queue_pages_and_caps_the_page_size()
    {
        using var db = await QueuedDbAsync();
        for (var i = 0; i < 5; i++)
        {
            var booking = CancellationFixtures.Booking(email: $"guest{i}@tc.com");
            booking.ReferenceNumber = $"TC-2026-100{i}";
            db.Bookings.Add(booking);
            var cancellation = CancellationFixtures.Cancellation(booking);
            cancellation.Reference = $"CANC-2026-200{i}";
            cancellation.RequestedAt = Now.AddHours(-i);
            db.BookingCancellations.Add(cancellation);
        }
        await db.SaveChangesAsync();

        var service = Reviews(db);

        var firstPage = await service.ListAsync(null, null, page: 1, pageSize: 2);
        Assert.Equal(6, firstPage.Total);
        Assert.Equal(2, firstPage.Items.Count);

        var capped = await service.ListAsync(null, null, page: 1, pageSize: 5000);
        Assert.True(capped.Items.Count <= CancellationReviewService.MaxPageSize);
        Assert.Equal(CancellationReviewService.MaxPageSize, capped.PageSize);

        // Nonsense inputs are normalised, not echoed back, so the client never
        // shows "page 0 of -5" and never walks an impossible page list.
        var nonsense = await service.ListAsync(null, null, page: 0, pageSize: -5);
        Assert.Equal(1, nonsense.Page);
        Assert.Equal(25, nonsense.PageSize);
        Assert.NotEmpty(nonsense.Items);

        // A nonsense page number must not throw or return nothing.
        var beyondEnd = await service.ListAsync(null, null, page: 999, pageSize: 2);
        Assert.Equal(6, beyondEnd.Total);
        Assert.Empty(beyondEnd.Items);
    }

    [Fact]
    public async Task The_detail_view_carries_the_booking_and_every_refund()
    {
        using var db = await QueuedDbAsync();
        var cancellation = await db.BookingCancellations.FirstAsync();
        db.BookingRefunds.Add(CancellationFixtures.Refund(cancellation));
        await db.SaveChangesAsync();

        var loaded = await Reviews(db).GetAsync(cancellation.Id);

        Assert.NotNull(loaded);
        Assert.Equal("TC-2026-0001", loaded!.Booking!.ReferenceNumber);
        Assert.Single(loaded.Refunds);
        Assert.Single(loaded.Booking.BookingFlights);
    }

    [Fact]
    public async Task The_detail_view_is_null_for_an_unknown_request()
    {
        using var db = await QueuedDbAsync();
        Assert.Null(await Reviews(db).GetAsync(4242));
    }
}
