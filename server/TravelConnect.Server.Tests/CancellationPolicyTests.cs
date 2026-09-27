using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;
using Xunit;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Unit Test Phase 2 — the configurable cancellation policy. These tests prove
/// the business rules are DATA, not code: a booking cancelled inside the
/// 24-hour grace period is fully refunded, a fare-based non-refundable ticket
/// gets ₱0, a past departure follows the no-show rule, and changing the policy
/// changes the outcome without touching a controller.
/// </summary>
public class CancellationPolicyTests
{
    private static readonly DateTime Now = new(2026, 6, 11, 9, 0, 0, DateTimeKind.Utc);

    private static TravelConnectDbContext Db() => TestDb.Create();

    private static async Task<TravelConnectDbContext> SeededDbAsync(
        CancellationPolicySettings? settings = null,
        IEnumerable<CancellationPolicyRule>? rules = null)
    {
        var db = Db();
        db.CancellationPolicySettings.Add(settings ?? CancellationPolicyService.Defaults.Settings());
        db.CancellationPolicyRules.AddRange(rules ?? CancellationPolicyService.Defaults.Rules());
        await db.SaveChangesAsync();
        return db;
    }

    private static CancellationPolicyService Service(TravelConnectDbContext db) => new(db);

    private static Booking Booked(
        int hoursSinceBooking,
        int hoursBeforeDeparture,
        string fareType = FareTypes.Economy,
        string status = BookingStatusValues.Upcoming) =>
        CancellationFixtures.Booking(
            total: 10000m,
            departure: Now.AddHours(hoursBeforeDeparture),
            createdAt: Now.AddHours(-hoursSinceBooking),
            fareType: fareType,
            status: status);

    // ── grace period ───────────────────────────────────────────────

    [Fact]
    public async Task Cancellation_within_24_hours_of_booking_uses_the_grace_rule()
    {
        using var db = await SeededDbAsync();
        var booking = Booked(hoursSinceBooking: 5, hoursBeforeDeparture: 480);

        var match = await Service(db).ResolveAsync(booking, Now);

        Assert.Equal(PolicyTiers.Grace, match.Tier);
        Assert.Equal(100, match.Rule!.RefundPercentage);
        Assert.Equal(0m, match.Rule.AirlineFeePercent);
        Assert.False(match.RequiresApproval);
        Assert.Equal(RefundResolutions.Cash, match.Resolution);
        Assert.Equal(5, match.HoursSinceBooking);
        Assert.Equal(480, match.HoursBeforeDeparture);
    }

    [Fact]
    public async Task Grace_period_boundary_is_inclusive_at_exactly_24_hours()
    {
        using var db = await SeededDbAsync();
        var at24 = Booked(hoursSinceBooking: 24, hoursBeforeDeparture: 480);
        var at25 = Booked(hoursSinceBooking: 25, hoursBeforeDeparture: 480);
        var service = Service(db);

        Assert.Equal(PolicyTiers.Grace, (await service.ResolveAsync(at24, Now)).Tier);
        Assert.Equal(PolicyTiers.Early, (await service.ResolveAsync(at25, Now)).Tier);
    }

    [Fact]
    public async Task Grace_period_length_is_configurable()
    {
        var settings = CancellationPolicyService.Defaults.Settings();
        settings.GracePeriodHours = 72;
        using var db = await SeededDbAsync(settings);
        var service = Service(db);

        // 48h after booking is inside the widened 72h window…
        Assert.Equal(PolicyTiers.Grace, (await service.ResolveAsync(Booked(48, 480), Now)).Tier);
        // …and 100h is not.
        Assert.Equal(PolicyTiers.Early, (await service.ResolveAsync(Booked(100, 480), Now)).Tier);
    }

    [Fact]
    public async Task Grace_rule_refunds_forty_eight_hours_when_the_fee_is_zero()
    {
        using var db = await SeededDbAsync();
        var match = await Service(db).ResolveAsync(Booked(10, 480), Now);

        // 100% refundable, no fees configured in the grace rule.
        Assert.Equal(100m, match.Rule!.RefundPercentage);
        Assert.Equal(0m, match.Rule.AgencyServiceFee);
        Assert.Equal(0m, match.Rule.PaymentProcessingFee);
    }

    // ── early / late windows ───────────────────────────────────────

    [Theory]
    [InlineData(720, PolicyTiers.Early)]   // 30 days out
    [InlineData(168, PolicyTiers.Early)]   // exactly 7 days out (inclusive)
    [InlineData(167, PolicyTiers.Late)]    // just inside 7 days
    [InlineData(72, PolicyTiers.Late)]     // exactly 3 days out
    [InlineData(71, PolicyTiers.Late)]     // very late window
    [InlineData(1, PolicyTiers.Late)]      // an hour before departure
    public async Task Hours_to_departure_selects_the_early_or_late_rule(int hoursBeforeDeparture, string expectedTier)
    {
        using var db = await SeededDbAsync();
        var match = await Service(db).ResolveAsync(Booked(hoursSinceBooking: 240, hoursBeforeDeparture), Now);

        Assert.Equal(expectedTier, match.Tier);
    }

    [Fact]
    public async Task Early_rule_deducts_a_fifteen_percent_airline_fee_and_the_agency_fees()
    {
        using var db = await SeededDbAsync();
        var match = await Service(db).ResolveAsync(Booked(240, 480), Now);

        Assert.Equal(PolicyTiers.Early, match.Tier);
        Assert.Equal(100, match.Rule!.RefundPercentage);
        Assert.Equal(15m, match.Rule.AirlineFeePercent);
        Assert.Equal(500m, match.Rule.AgencyServiceFee);
        Assert.Equal(100m, match.Rule.PaymentProcessingFee);
        Assert.False(match.RequiresApproval);
    }

    [Fact]
    public async Task Late_cancellation_requires_approval_and_lowers_the_percentage()
    {
        using var db = await SeededDbAsync();
        var match = await Service(db).ResolveAsync(Booked(240, 100), Now);

        Assert.Equal(PolicyTiers.Late, match.Tier);
        Assert.Equal(75, match.Rule!.RefundPercentage);
        Assert.True(match.RequiresApproval);
    }

    [Fact]
    public async Task Very_late_cancellation_uses_the_lower_percentage_window()
    {
        using var db = await SeededDbAsync();
        var match = await Service(db).ResolveAsync(Booked(240, 10), Now);

        Assert.Equal(PolicyTiers.Late, match.Tier);
        Assert.Equal(60, match.Rule!.RefundPercentage);
        Assert.True(match.RequiresApproval);
    }

    // ── non-refundable fare ────────────────────────────────────────

    [Fact]
    public async Task Non_refundable_fare_resolves_to_the_travel_credit_rule()
    {
        using var db = await SeededDbAsync();
        var match = await Service(db).ResolveAsync(Booked(2, 480, FareTypes.NonRefundable), Now);

        Assert.Equal(PolicyTiers.NonRefundable, match.Tier);
        Assert.Equal(0, match.Rule!.RefundPercentage);
        Assert.True(match.Rule.IsNonRefundable);
        Assert.Equal(RefundResolutions.TravelCredit, match.Resolution);
        Assert.True(match.RequiresApproval);
    }

    [Fact]
    public async Task Non_refundable_fare_wins_even_inside_the_grace_period()
    {
        using var db = await SeededDbAsync();
        var match = await Service(db).ResolveAsync(Booked(1, 480, FareTypes.NonRefundable), Now);

        Assert.Equal(PolicyTiers.NonRefundable, match.Tier);
        Assert.Equal(0, match.Rule!.RefundPercentage);
    }

    [Fact]
    public async Task Non_refundable_resolution_is_configurable()
    {
        var settings = CancellationPolicyService.Defaults.Settings();
        settings.NonRefundableResolution = RefundResolutions.None;
        var rules = CancellationPolicyService.Defaults.Rules();
        rules.First(r => r.PolicyTier == PolicyTiers.NonRefundable).Resolution = RefundResolutions.None;

        using var db = await SeededDbAsync(settings, rules);
        var match = await Service(db).ResolveAsync(Booked(2, 480, FareTypes.NonRefundable), Now);

        Assert.Equal(RefundResolutions.None, match.Resolution);
        Assert.True(match.RequiresApproval);
    }

    [Fact]
    public async Task Empty_legacy_fare_type_is_treated_as_economy()
    {
        using var db = await SeededDbAsync();
        var booking = Booked(240, 480);
        booking.FareType = "";

        var match = await Service(db).ResolveAsync(booking, Now);

        Assert.Equal(FareTypes.Economy, match.FareType);
        Assert.Equal(PolicyTiers.Early, match.Tier);
    }

    // ── no-show / past departure ───────────────────────────────────

    [Fact]
    public async Task Departure_in_the_past_resolves_to_the_no_show_rule()
    {
        using var db = await SeededDbAsync();
        var match = await Service(db).ResolveAsync(Booked(240, -5), Now);

        Assert.Equal(PolicyTiers.NoShow, match.Tier);
        Assert.True(match.PastDeparture);
        Assert.Equal(0, match.Rule!.RefundPercentage);
        Assert.True(match.RequiresApproval);
        Assert.Equal(RefundResolutions.None, match.Resolution);
    }

    [Fact]
    public async Task No_show_requires_approval_by_default_and_can_be_configured_off()
    {
        using var strict = await SeededDbAsync();
        Assert.True((await Service(strict).ResolveAsync(Booked(240, -5), Now)).RequiresApproval);

        var relaxed = CancellationPolicyService.Defaults.Settings();
        relaxed.RequireApprovalNoShow = false;
        var rules = CancellationPolicyService.Defaults.Rules();
        rules.First(r => r.PolicyTier == PolicyTiers.NoShow).RequiresApproval = false;
        using var db = await SeededDbAsync(relaxed, rules);

        Assert.False((await Service(db).ResolveAsync(Booked(240, -5), Now)).RequiresApproval);
    }

    // ── configurable numbers ───────────────────────────────────────

    [Fact]
    public async Task Refund_percentage_is_taken_from_the_rule_not_the_code()
    {
        var rules = CancellationPolicyService.Defaults.Rules();
        rules.First(r => r.PolicyTier == PolicyTiers.Early).RefundPercentage = 80;
        using var db = await SeededDbAsync(rules: rules);

        var match = await Service(db).ResolveAsync(Booked(240, 480), Now);

        Assert.Equal(80, match.Rule!.RefundPercentage);
    }

    [Fact]
    public async Task Fees_are_taken_from_the_rule()
    {
        var rules = CancellationPolicyService.Defaults.Rules();
        var early = rules.First(r => r.PolicyTier == PolicyTiers.Early);
        early.AirlineFeeAmount = 2000m;
        early.AgencyServiceFee = 750m;
        early.PaymentProcessingFee = 25m;
        early.OtherFee = 50m;
        using var db = await SeededDbAsync(rules: rules);

        var rule = (await Service(db).ResolveAsync(Booked(240, 480), Now)).Rule!;

        Assert.Equal(2000m, rule.AirlineFeeAmount);
        Assert.Equal(750m, rule.AgencyServiceFee);
        Assert.Equal(25m, rule.PaymentProcessingFee);
        Assert.Equal(50m, rule.OtherFee);
    }

    [Fact]
    public async Task Policy_changes_take_effect_for_the_next_cancellation()
    {
        using var db = await SeededDbAsync();
        var service = Service(db);
        var booking = Booked(240, 480);

        Assert.Equal(15m, (await service.ResolveAsync(booking, Now)).Rule!.AirlineFeePercent);

        var rules = await db.CancellationPolicyRules.ToListAsync();
        rules.First(r => r.PolicyTier == PolicyTiers.Early).AirlineFeePercent = 25m;
        await db.SaveChangesAsync();

        Assert.Equal(25m, (await service.ResolveAsync(booking, Now)).Rule!.AirlineFeePercent);
    }

    [Fact]
    public async Task Inactive_rules_are_ignored()
    {
        var rules = CancellationPolicyService.Defaults.Rules();
        foreach (var rule in rules.Where(r => r.PolicyTier is PolicyTiers.Early or PolicyTiers.Late))
            rule.IsActive = false;
        using var db = await SeededDbAsync(rules: rules);

        var match = await Service(db).ResolveAsync(Booked(240, 480), Now);

        Assert.False(match.Matched);
        Assert.Equal(PolicyTiers.Late, match.Tier);
        Assert.True(match.RequiresApproval);
        Assert.Equal(RefundResolutions.None, match.Resolution);
    }

    [Fact]
    public async Task A_policy_gap_never_produces_an_automatic_refund()
    {
        using var db = await SeededDbAsync(rules: []);
        var match = await Service(db).ResolveAsync(Booked(240, 480), Now);

        Assert.False(match.Matched);
        Assert.NotNull(match.FallbackReason);
        Assert.True(match.RequiresApproval);
        Assert.Equal(RefundResolutions.None, match.Resolution);
    }

    [Fact]
    public async Task An_airline_specific_rule_outranks_the_generic_one()
    {
        var rules = CancellationPolicyService.Defaults.Rules();
        rules.Add(new CancellationPolicyRule
        {
            Name = "Cebu Pacific promo fare",
            PolicyTier = PolicyTiers.Early,
            Airline = "Cebu Pacific",
            RefundPercentage = 50,
            AirlineFeePercent = 10m,
            RequiresApproval = true,
            Resolution = RefundResolutions.Cash,
            Priority = 200
        });
        using var db = await SeededDbAsync(rules: rules);
        var service = Service(db);

        var cebuan = Booked(240, 480);
        Assert.Equal("Cebu Pacific", await CancellationPolicyService.ResolveAirlineAsync(cebuan));
        var specific = await service.ResolveAsync(cebuan, Now);
        Assert.Equal("Cebu Pacific promo fare", specific.Rule!.Name);
        Assert.Equal(50, specific.Rule.RefundPercentage);

        // Another airline still falls back to the generic rule.
        var pal = Booked(240, 480);
        pal.BookingFlights[0].Airline = "Philippine Airlines";
        Assert.Equal("Early cancellation (7+ days before departure)", (await service.ResolveAsync(pal, Now)).Rule!.Name);
    }

    [Fact]
    public async Task Highest_priority_wins_when_two_rules_cover_the_same_window()
    {
        var rules = CancellationPolicyService.Defaults.Rules();
        rules.First(r => r.Name.StartsWith("Late cancellation", StringComparison.Ordinal)).Priority = 500;
        using var db = await SeededDbAsync(rules: rules);

        var match = await Service(db).ResolveAsync(Booked(240, 100), Now);

        Assert.Equal(500, match.Rule!.Priority);
        Assert.Equal(75, match.Rule.RefundPercentage);
    }

    [Fact]
    public async Task Rule_approval_flag_overrides_the_agency_setting()
    {
        var rules = CancellationPolicyService.Defaults.Rules();
        rules.First(r => r.PolicyTier == PolicyTiers.Grace).RequiresApproval = true;
        using var db = await SeededDbAsync(rules: rules);

        var match = await Service(db).ResolveAsync(Booked(5, 480), Now);

        Assert.True(match.RequiresApproval);
    }

    [Fact]
    public async Task Null_approval_flag_inherits_the_agency_setting()
    {
        var rules = CancellationPolicyService.Defaults.Rules();
        rules.First(r => r.PolicyTier == PolicyTiers.Grace).RequiresApproval = null;

        // Agency says "no auto approval" — the rule inherits that and queues for review.
        var manual = CancellationPolicyService.Defaults.Settings();
        manual.AutoApproveGracePeriod = false;
        using var strictDb = await SeededDbAsync(manual, rules);
        var strictMatch = await Service(strictDb).ResolveAsync(Booked(5, 480), Now);
        Assert.True(strictMatch.RequiresApproval);
        Assert.True(CancellationPolicyService.RequiresApprovalFor(strictMatch.Rule!, manual));

        // Agency says "auto approve" — the same null rule now auto-approves.
        var auto = CancellationPolicyService.Defaults.Settings();
        auto.AutoApproveGracePeriod = true;
        using var autoDb = await SeededDbAsync(auto, rules);
        var autoMatch = await Service(autoDb).ResolveAsync(Booked(5, 480), Now);
        Assert.False(autoMatch.RequiresApproval);
        Assert.False(CancellationPolicyService.RequiresApprovalFor(autoMatch.Rule!, auto));
    }

    // ── departure resolution ───────────────────────────────────────

    [Fact]
    public void Departure_uses_the_latest_segment_date_and_time()
    {
        var booking = CancellationFixtures.Booking(departure: new DateTime(2026, 7, 1, 8, 0, 0, DateTimeKind.Utc));
        booking.BookingFlights.Clear();
        booking.BookingFlights.Add(new BookingFlight
        {
            SegmentOrder = 1, DepartureDate = "2026-07-01", DepartureTime = "08:00", Airline = "PAL"
        });
        booking.BookingFlights.Add(new BookingFlight
        {
            SegmentOrder = 2, DepartureDate = "2026-07-03", DepartureTime = "19:45", Airline = "SQ"
        });

        var departure = BookingDeparture.Resolve(booking);

        Assert.Equal(new DateTime(2026, 7, 3, 19, 45, 0), departure);
    }

    [Fact]
    public void Departure_falls_back_to_the_itinerary_end_date()
    {
        var booking = CancellationFixtures.Booking();
        booking.BookingFlights.Clear();
        booking.EndDate = "2026-08-20";
        booking.StartDate = "2026-08-15";

        Assert.Equal(new DateTime(2026, 8, 20, 0, 0, 0), BookingDeparture.Resolve(booking));
    }

    [Fact]
    public void Departure_is_null_when_the_booking_has_no_dates()
    {
        var booking = CancellationFixtures.Booking();
        booking.BookingFlights.Clear();
        booking.StartDate = "";
        booking.EndDate = "";

        Assert.Null(BookingDeparture.Resolve(booking));
    }

    [Fact]
    public async Task A_booking_without_a_departure_is_treated_as_not_past_departure()
    {
        var booking = Booked(240, 480);
        booking.BookingFlights.Clear();
        booking.StartDate = "";
        booking.EndDate = "";
        using var db = await SeededDbAsync();

        var match = await Service(db).ResolveAsync(booking, Now);

        Assert.False(match.PastDeparture);
        Assert.Null(match.DepartureAt);
    }

    // ── persistence & defaults ─────────────────────────────────────

    [Fact]
    public async Task Policy_is_stored_in_the_database_and_reloaded_by_the_service()
    {
        using var db = Db();
        db.CancellationPolicySettings.Add(CancellationPolicyService.Defaults.Settings());
        db.CancellationPolicyRules.AddRange(CancellationPolicyService.Defaults.Rules());
        await db.SaveChangesAsync();

        using var reloaded = TestDb.Create();
        // Same row set, fresh context — proves the policy is data, not state.
        reloaded.CancellationPolicySettings.AddRange(db.CancellationPolicySettings.ToList());
        reloaded.CancellationPolicyRules.AddRange(db.CancellationPolicyRules.ToList());
        await reloaded.SaveChangesAsync();

        var settings = await new CancellationPolicyService(reloaded).GetActiveSettingsAsync();
        var rules = await new CancellationPolicyService(reloaded).GetActiveRulesAsync();

        Assert.Equal(24, settings.GracePeriodHours);
        Assert.Equal(6, rules.Count);
        Assert.Contains(rules, r => r.PolicyTier == PolicyTiers.Grace);
        Assert.Contains(rules, r => r.PolicyTier == PolicyTiers.NoShow);
    }

    [Fact]
    public async Task Missing_settings_falls_back_to_the_documented_defaults()
    {
        using var db = Db();
        var settings = await Service(db).GetActiveSettingsAsync();

        Assert.Equal(24, settings.GracePeriodHours);
        Assert.True(settings.AutoApproveGracePeriod);
        Assert.True(settings.RequireApprovalNoShow);
        Assert.Equal(100m, settings.MaxRefundOverridePercent);
    }

    [Fact]
    public void Default_rules_reproduce_the_worked_example()
    {
        var early = CancellationPolicyService.Defaults.Rules()
            .Single(r => r.PolicyTier == PolicyTiers.Early);

        // ₱10,000 − 15% (₱1,500) − ₱500 − ₱100 = ₱7,900
        var original = 10000m;
        var airline = original * early.AirlineFeePercent / 100m;
        Assert.Equal(1500m, airline);
        Assert.Equal(7900m, original - airline - early.AgencyServiceFee - early.PaymentProcessingFee);
    }

    [Fact]
    public void Policy_tier_vocabulary_is_closed()
    {
        Assert.Equal(
            new[] { "grace", "early", "late", "non-refundable", "no-show" },
            PolicyTiers.All);
        Assert.True(PolicyTiers.IsValid("early"));
        Assert.False(PolicyTiers.IsValid("whenever"));
        Assert.False(PolicyTiers.IsValid(null));
    }
}
