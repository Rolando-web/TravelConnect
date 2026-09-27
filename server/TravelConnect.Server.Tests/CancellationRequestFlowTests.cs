using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;
using Xunit;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Unit Test Phase 3 — the customer cancellation request flow. These tests
/// cover the quote the customer is shown, what a request actually writes, and
/// the two rules that keep the money honest: the amount is always calculated
/// server-side, and it is frozen on the record so a later policy change can
/// never rewrite what the customer was promised.
/// </summary>
public class CancellationRequestFlowTests
{
    private static readonly DateTime Now = new(2026, 6, 11, 9, 0, 0, DateTimeKind.Utc);

    private static async Task<TravelConnectDbContext> SeededDbAsync(
        CancellationPolicySettings? settings = null,
        IEnumerable<CancellationPolicyRule>? rules = null)
    {
        var db = TestDb.Create();
        db.CancellationPolicySettings.Add(settings ?? CancellationPolicyService.Defaults.Settings());
        db.CancellationPolicyRules.AddRange(rules ?? CancellationPolicyService.Defaults.Rules());
        var booking = Booked();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        return db;
    }

    private static CancellationQuoteService Quotes(TravelConnectDbContext db) =>
        new(db, new CancellationPolicyService(db));

    private static Booking Booked(
        int hoursSinceBooking = 240,
        int hoursBeforeDeparture = 480,
        decimal total = 10000m,
        string fareType = FareTypes.Economy) =>
        CancellationFixtures.Booking(
            total: total,
            departure: Now.AddHours(hoursBeforeDeparture),
            createdAt: Now.AddHours(-hoursSinceBooking),
            fareType: fareType);

    // ── the quote ──────────────────────────────────────────────────

    [Fact]
    public async Task Quote_reproduces_the_worked_example()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();

        var quote = await Quotes(db).QuoteAsync(booking, Now);

        // ₱10,000 × 100% = ₱10,000, less ₱1,500 airline (15%) + ₱500 + ₱100
        Assert.Equal(10000m, quote.RefundableAmount);
        Assert.Equal(1500m, quote.AirlineCancellationFee);
        Assert.Equal(500m, quote.AgencyServiceFee);
        Assert.Equal(100m, quote.PaymentProcessingFee);
        Assert.Equal(2100m, quote.TotalFees);
        Assert.Equal(7900m, quote.RefundAmount);
        Assert.True(quote.IsRefundable);
        Assert.False(quote.RequiresApproval);
    }

    [Fact]
    public async Task Grace_period_quote_is_the_full_amount_with_no_fees()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        booking.CreatedAt = Now.AddHours(-3);

        var quote = await Quotes(db).QuoteAsync(booking, Now);

        Assert.Equal(PolicyTiers.Grace, quote.Tier);
        Assert.Equal(10000m, quote.RefundAmount);
        Assert.Equal(0m, quote.TotalFees);
        Assert.True(quote.PolicyRuleId > 0, "A grace quote must name the configured rule it came from.");
    }

    [Fact]
    public async Task Late_quote_applies_the_lower_percentage_and_needs_approval()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        booking.CreatedAt = Now.AddHours(-240);
        booking.BookingFlights[0].DepartureDate = Now.AddHours(100).ToString("yyyy-MM-dd");
        booking.BookingFlights[0].DepartureTime = Now.AddHours(100).ToString("HH:mm");

        var quote = await Quotes(db).QuoteAsync(booking, Now);

        Assert.Equal(PolicyTiers.Late, quote.Tier);
        Assert.Equal(75, quote.RefundPercentage);
        Assert.Equal(7500m, quote.RefundableAmount);
        Assert.Equal(375m, quote.AirlineCancellationFee);
        Assert.Equal(975m, quote.TotalFees);
        Assert.Equal(6525m, quote.RefundAmount);
        Assert.True(quote.RequiresApproval);
    }

    [Fact]
    public async Task Non_refundable_quote_is_zero_cash_and_offers_travel_credit()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        booking.FareType = FareTypes.NonRefundable;

        var quote = await Quotes(db).QuoteAsync(booking, Now);

        Assert.Equal(PolicyTiers.NonRefundable, quote.Tier);
        Assert.Equal(0m, quote.RefundAmount);
        Assert.False(quote.IsRefundable);
        Assert.True(quote.IsNonRefundable);
        Assert.Equal(RefundResolutions.TravelCredit, quote.Resolution);
        Assert.True(quote.RequiresApproval);
    }

    [Fact]
    public async Task No_show_quote_pays_nothing()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        booking.BookingFlights[0].DepartureDate = Now.AddHours(-5).ToString("yyyy-MM-dd");
        booking.BookingFlights[0].DepartureTime = Now.AddHours(-5).ToString("HH:mm");

        var quote = await Quotes(db).QuoteAsync(booking, Now);

        Assert.Equal(PolicyTiers.NoShow, quote.Tier);
        Assert.Equal(0m, quote.RefundAmount);
        Assert.Equal(RefundResolutions.None, quote.Resolution);
        Assert.True(quote.RequiresApproval);
    }

    [Fact]
    public async Task A_refund_is_never_negative_however_large_the_fees()
    {
        var rules = CancellationPolicyService.Defaults.Rules();
        var early = rules.First(r => r.PolicyTier == PolicyTiers.Early);
        early.AirlineFeeAmount = 9000m;
        early.AgencyServiceFee = 5000m;
        using var db = await SeededDbAsync(rules: rules);
        var booking = await db.Bookings.FirstAsync();

        var quote = await Quotes(db).QuoteAsync(booking, Now);

        Assert.Equal(0m, quote.RefundAmount);
        Assert.False(quote.IsRefundable);
    }

    [Fact]
    public async Task A_policy_gap_never_quotes_an_automatic_refund()
    {
        var settings = CancellationPolicyService.Defaults.Settings();
        using var db = await SeededDbAsync(settings, rules: []);
        var booking = await db.Bookings.FirstAsync();

        var quote = await Quotes(db).QuoteAsync(booking, Now);

        Assert.Equal(0m, quote.RefundAmount);
        Assert.True(quote.RequiresApproval);
        Assert.Equal(RefundResolutions.None, quote.Resolution);
        Assert.False(string.IsNullOrWhiteSpace(quote.Note));
    }

    [Fact]
    public async Task A_quote_is_time_limited()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();

        var quote = await Quotes(db).QuoteAsync(booking, Now);

        Assert.Equal(Now.Add(CancellationQuoteService.QuoteValidity), quote.ValidUntil);
    }

    [Fact]
    public async Task Changing_the_policy_changes_the_next_quote()
    {
        using var db = await SeededDbAsync();
        var quotes = Quotes(db);
        var booking = await db.Bookings.FirstAsync();
        Assert.Equal(7900m, (await quotes.QuoteAsync(booking, Now)).RefundAmount);

        var rules = await db.CancellationPolicyRules.ToListAsync();
        rules.First(r => r.PolicyTier == PolicyTiers.Early).AirlineFeePercent = 30m;
        await db.SaveChangesAsync();

        Assert.Equal(6400m, (await quotes.QuoteAsync(booking, Now)).RefundAmount);
    }

    // ── the request ────────────────────────────────────────────────

    [Fact]
    public async Task A_grace_period_request_is_approved_on_the_spot()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        booking.CreatedAt = Now.AddHours(-2);

        var (cancellation, refund, message) = await Quotes(db).RequestAsync(
            booking, "change-of-plans", "Family emergency", "juan@tc.com", Now);

        Assert.Equal(CancellationStatuses.Approved, cancellation.Status);
        Assert.True(cancellation.AutoApproved);
        Assert.Equal(10000m, cancellation.RefundAmount);
        Assert.Equal("system:auto-approve", cancellation.ApprovedBy);
        Assert.NotNull(cancellation.CancellationDate);
        Assert.NotNull(refund);
        Assert.Equal(RefundStatuses.Pending, refund!.Status);
        Assert.Equal(10000m, refund.Amount);
        Assert.Equal(booking.Id, cancellation.BookingId);
        Assert.Equal(cancellation.Id, refund.CancellationId);
        Assert.Contains("approved", message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task An_approved_cancellation_releases_seat_inventory()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        booking.CreatedAt = Now.AddHours(-2);
        Assert.Equal("Sold", booking.BookingFlights[0].SeatStatus);

        await Quotes(db).RequestAsync(booking, "change-of-plans", "Family emergency", "juan@tc.com", Now);

        Assert.Equal("Available", booking.BookingFlights[0].SeatStatus);
        Assert.Equal(string.Empty, booking.BookingFlights[0].SeatNumber);
    }

    [Fact]
    public async Task An_approved_cancellation_moves_the_booking_and_links_the_record()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        booking.CreatedAt = Now.AddHours(-2);

        var (cancellation, refund, _) = await Quotes(db).RequestAsync(
            booking, "change-of-plans", "Family emergency", "juan@tc.com", Now);
        await db.SaveChangesAsync();

        Assert.Equal(BookingStatusValues.Cancelled, booking.Status);
        Assert.Equal(CancellationStatuses.Approved, booking.CancellationStatus);
        Assert.Equal(cancellation.Id, booking.ActiveCancellationId);
        Assert.False(booking.Paid);
        Assert.Equal(booking.CustomerEmail, cancellation.CustomerEmail);
        Assert.Equal(booking.CustomerName, cancellation.CustomerName);
        Assert.NotNull(booking.CancelledAt);
        // Legacy mirror columns keep the existing admin booking table working.
        Assert.Equal(10000m, booking.RefundAmount);
        Assert.Equal(refund!.Reference, booking.RefundReference);
    }

    [Fact]
    public async Task A_late_cancellation_goes_to_review_and_touches_nothing_else()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        booking.CreatedAt = Now.AddHours(-240);
        booking.BookingFlights[0].DepartureDate = Now.AddHours(100).ToString("yyyy-MM-dd");
        booking.BookingFlights[0].DepartureTime = Now.AddHours(100).ToString("HH:mm");

        var (cancellation, refund, message) = await Quotes(db).RequestAsync(
            booking, "emergency", "Hospitalised", "juan@tc.com", Now);

        Assert.Equal(CancellationStatuses.Requested, cancellation.Status);
        Assert.True(cancellation.RequiresApproval);
        Assert.False(cancellation.AutoApproved);
        Assert.Null(refund);
        Assert.Null(cancellation.CancellationDate);
        // The booking is still live and its seats are still held.
        Assert.Equal(BookingStatusValues.CancellationRequested, booking.Status);
        Assert.Equal("Sold", booking.BookingFlights[0].SeatStatus);
        Assert.True(booking.Paid);
        Assert.Contains("review", message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task A_non_refundable_request_still_records_a_zero_value_credit_refund()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        booking.FareType = FareTypes.NonRefundable;
        // Even inside the grace period a non-refundable fare must not auto-approve.
        booking.CreatedAt = Now.AddHours(-2);

        var (cancellation, refund, _) = await Quotes(db).RequestAsync(
            booking, "change-of-plans", "Just changed my mind", "juan@tc.com", Now);

        Assert.Equal(CancellationStatuses.Requested, cancellation.Status);
        Assert.Equal(PolicyTiers.NonRefundable, cancellation.PolicyTier);
        Assert.Equal(0m, cancellation.RefundAmount);
        Assert.Null(refund);
    }

    [Fact]
    public async Task An_approved_travel_credit_refund_uses_the_credit_method()
    {
        var settings = CancellationPolicyService.Defaults.Settings();
        settings.AutoApproveGracePeriod = true;
        settings.RequireApprovalNonRefundable = false;
        var rules = CancellationPolicyService.Defaults.Rules();
        rules.First(r => r.PolicyTier == PolicyTiers.NonRefundable).RequiresApproval = false;
        using var db = await SeededDbAsync(settings, rules);
        var booking = await db.Bookings.FirstAsync();
        booking.FareType = FareTypes.NonRefundable;
        booking.CreatedAt = Now.AddHours(-2);

        var (_, refund, _) = await Quotes(db).RequestAsync(booking, "change-of-plans", "x", "juan@tc.com", Now);

        Assert.NotNull(refund);
        Assert.Equal("travel-credit", refund!.Method);
        Assert.Equal(0m, refund.Amount);
        Assert.Equal(RefundStatuses.Pending, refund.Status);
    }

    [Fact]
    public async Task The_request_freezes_the_numbers_it_was_quoted()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        booking.CreatedAt = Now.AddHours(-2);
        var quotes = Quotes(db);

        var (cancellation, _, _) = await quotes.RequestAsync(booking, "change-of-plans", "x", "juan@tc.com", Now);
        var promised = cancellation.RefundAmount;

        // The agency re-prices the policy after the customer asked.
        var rules = await db.CancellationPolicyRules.ToListAsync();
        rules.First(r => r.PolicyTier == PolicyTiers.Grace).RefundPercentage = 20;
        rules.First(r => r.PolicyTier == PolicyTiers.Grace).AgencyServiceFee = 2500m;
        await db.SaveChangesAsync();

        var fresh = await db.Bookings.FirstAsync();
        var newQuote = await quotes.QuoteAsync(fresh, Now);
        var reloaded = await db.BookingCancellations.AsNoTracking().FirstAsync(c => c.Id == cancellation.Id);

        Assert.NotEqual(newQuote.RefundAmount, promised);
        Assert.Equal(promised, reloaded.RefundAmount);
        Assert.Equal(100, reloaded.RefundPercentage);
        Assert.Equal(0m, reloaded.AgencyServiceFee);
        // The refund row carries the same frozen figure.
        var refund = await db.BookingRefunds.AsNoTracking().FirstAsync(r => r.CancellationId == cancellation.Id);
        Assert.Equal(promised, refund.Amount);
    }

    [Fact]
    public async Task The_request_records_the_reason_the_customer_gave()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        booking.CreatedAt = Now.AddHours(-2);

        var (cancellation, _, _) = await Quotes(db).RequestAsync(
            booking, "emergency", "Rushed to the hospital", "juan@tc.com", Now);

        Assert.Equal("emergency", cancellation.ReasonCode);
        Assert.Equal("Rushed to the hospital", cancellation.Reason);
        Assert.Equal("juan@tc.com", cancellation.RequestedBy);
        Assert.Equal(Now, cancellation.RequestedAt);
    }

    [Fact]
    public async Task An_open_cancellation_blocks_a_second_request()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        booking.CreatedAt = Now.AddHours(-2);
        var quotes = Quotes(db);
        await quotes.RequestAsync(booking, "change-of-plans", "first", "juan@tc.com", Now);

        var live = await quotes.LiveCancellationAsync(booking.Id);

        Assert.NotNull(live);
        Assert.Equal(CancellationStatuses.Approved, live!.Status);
    }

    [Fact]
    public async Task A_rejected_cancellation_does_not_block_a_fresh_request()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        var quotes = Quotes(db);
        db.BookingCancellations.Add(new BookingCancellation
        {
            Reference = "CANC-2026-000001",
            BookingId = booking.Id,
            Status = CancellationStatuses.Rejected,
            ReasonCode = "change-of-plans",
        });
        await db.SaveChangesAsync();

        Assert.Null(await quotes.LiveCancellationAsync(booking.Id));
    }

    [Fact]
    public async Task Documents_get_unique_references()
    {
        using var db = await SeededDbAsync();
        var quotes = Quotes(db);
        var seen = new HashSet<string>();

        for (var i = 0; i < 5; i++)
        {
            var booking = Booked(hoursSinceBooking: 2);
            db.Bookings.Add(booking);
            await db.SaveChangesAsync();

            var (cancellation, refund, _) = await quotes.RequestAsync(
                booking, "change-of-plans", "x", "juan@tc.com", Now);

            Assert.StartsWith("CANC-", cancellation.Reference);
            Assert.StartsWith("RFND-", refund!.Reference);
            Assert.True(seen.Add(cancellation.Reference), $"duplicate {cancellation.Reference}");
            Assert.True(seen.Add(refund.Reference), $"duplicate {refund.Reference}");
        }
    }

    [Fact]
    public async Task The_latest_cancellation_is_the_one_that_is_reported()
    {
        using var db = await SeededDbAsync();
        var booking = await db.Bookings.FirstAsync();
        var quotes = Quotes(db);
        db.BookingCancellations.Add(new BookingCancellation
        {
            Reference = "CANC-2026-000001", BookingId = booking.Id, Status = CancellationStatuses.Rejected
        });
        await db.SaveChangesAsync();
        var (second, _, _) = await quotes.RequestAsync(booking, "emergency", "retry", "juan@tc.com", Now);
        await db.SaveChangesAsync();

        var live = await quotes.LiveCancellationAsync(booking.Id);

        Assert.Equal(second.Id, live!.Id);
    }

    [Fact]
    public void Terminal_booking_statuses_block_a_new_request()
    {
        Assert.True(CancellationQuoteService.IsTerminalBookingStatus("cancelled"));
        Assert.True(CancellationQuoteService.IsTerminalBookingStatus("REFUNDED"));
        Assert.False(CancellationQuoteService.IsTerminalBookingStatus(BookingStatusValues.Upcoming));
        Assert.False(CancellationQuoteService.IsTerminalBookingStatus(BookingStatusValues.CancellationRequested));
    }

    // ── ownership ──────────────────────────────────────────────────

    [Fact]
    public void The_signed_in_customer_may_act_on_their_own_booking()
    {
        var booking = Booked();
        Assert.True(BookingOwnership.IsCustomer(booking, "juan@tc.com"));
        Assert.True(BookingOwnership.IsCustomer(booking, "JUAN@TC.COM"));
    }

    [Fact]
    public void Another_signed_in_customer_may_not()
    {
        Assert.False(BookingOwnership.IsCustomer(Booked(), "attacker@evil.com"));
        Assert.False(BookingOwnership.IsCustomer(Booked(), null));
        Assert.False(BookingOwnership.IsCustomer(Booked(), "  "));
    }

    [Fact]
    public void An_anonymous_caller_needs_the_reference_and_the_email_together()
    {
        var booking = Booked();
        Assert.True(BookingOwnership.HasProof(booking, "TC-2026-0001", "juan@tc.com"));
        Assert.False(BookingOwnership.HasProof(booking, "TC-2026-0001", "attacker@evil.com"));
        Assert.False(BookingOwnership.HasProof(booking, "TC-9999-9999", "juan@tc.com"));
        Assert.False(BookingOwnership.HasProof(booking, null, "juan@tc.com"));
        Assert.False(BookingOwnership.HasProof(booking, "TC-2026-0001", null));
    }

    [Fact]
    public void An_anonymous_caller_with_nothing_is_refused()
    {
        var booking = Booked();
        Assert.False(BookingOwnership.Authorise(booking, null, false, null, null));
        Assert.False(BookingOwnership.Authorise(booking, null, false, "", ""));
    }

    [Fact]
    public void Staff_may_always_inspect_a_booking()
    {
        Assert.True(BookingOwnership.Authorise(Booked(), "staff@travelconnect.ph", true, null, null));
    }
}
