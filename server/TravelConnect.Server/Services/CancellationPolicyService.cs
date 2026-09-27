using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Services;

/// <summary>The policy that applies to one booking at one instant.</summary>
public record PolicyMatch(
    CancellationPolicySettings Settings,
    CancellationPolicyRule? Rule,
    string Tier,
    bool RequiresApproval,
    string Resolution,
    bool IsNonRefundable,
    bool PastDeparture,
    DateTime? DepartureAt,
    int HoursSinceBooking,
    int HoursBeforeDeparture,
    string FareType,
    string Airline,
    string? FallbackReason)
{
    public bool Matched => Rule is not null;
    public string PolicyName => Rule?.Name ?? Settings.Name;
}

/// <summary>
/// The only place a cancellation policy is interpreted. Every refund number in
/// the system flows from a rule row selected here, so administrators can change
/// grace periods, refund percentages, fees and approval routing at runtime
/// without a code change — and no controller ever hard-codes a percentage.
/// </summary>
public class CancellationPolicyService(TravelConnectDbContext db)
{
    public async Task<CancellationPolicySettings> GetActiveSettingsAsync(CancellationToken ct = default) =>
        await db.CancellationPolicySettings
            .AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.Id)
            .FirstOrDefaultAsync(ct)
        ?? Defaults.Settings();

    public async Task<List<CancellationPolicyRule>> GetActiveRulesAsync(CancellationToken ct = default) =>
        await db.CancellationPolicyRules
            .AsNoTracking()
            .Where(r => r.IsActive)
            .OrderByDescending(r => r.Priority)
            .ThenBy(r => r.Id)
            .ToListAsync(ct);

    /// <summary>
    /// Picks the rule that governs this booking right now. Order of decisions:
    /// departure already passed → no-show; a non-refundable fare → non-refundable;
    /// inside the grace period → grace; otherwise the early/late window that
    /// contains the hours-to-departure. When nothing matches (a policy gap) the
    /// booking is still cancellable, but the result is a manual-approval,
    /// no-automatic-refund outcome rather than an accidental full refund.
    /// </summary>
    public async Task<PolicyMatch> ResolveAsync(Booking booking, DateTime? at = null, CancellationToken ct = default)
    {
        var now = at ?? DateTime.UtcNow;
        var settings = await GetActiveSettingsAsync(ct);
        var rules = await GetActiveRulesAsync(ct);

        var fareType = FareTypes.Normalize(booking.FareType);
        var airline = await ResolveAirlineAsync(booking, ct);
        var departure = BookingDeparture.Resolve(booking);
        var hoursSinceBooking = BookingDeparture.HoursBetween(booking.CreatedAt, now);
        var pastDeparture = departure.HasValue && departure.Value <= now;
        var hoursBeforeDeparture = departure.HasValue
            ? BookingDeparture.HoursBetween(now, departure.Value)
            : 0;

        PolicyMatch Build(CancellationPolicyRule rule) => new(
            settings,
            rule,
            rule.PolicyTier,
            RequiresApprovalFor(rule, settings),
            rule.Resolution,
            rule.IsNonRefundable,
            pastDeparture,
            departure,
            hoursSinceBooking,
            hoursBeforeDeparture,
            fareType,
            airline,
            null);

        // 1) Departure has passed — no-show rules win over everything.
        if (pastDeparture)
        {
            var noShow = Best(rules, PolicyTiers.NoShow, fareType, airline);
            if (noShow is not null) return Build(noShow);
            return Fallback(settings, PolicyTiers.NoShow, "No no-show policy rule is configured", fareType, airline,
                departure, hoursSinceBooking, hoursBeforeDeparture, pastDeparture);
        }

        // 2) A non-refundable fare is never cash-refunded automatically.
        var nonRefundable = Best(rules, PolicyTiers.NonRefundable, fareType, airline);
        if (nonRefundable is not null &&
            (nonRefundable.IsNonRefundable ||
             string.Equals(nonRefundable.FareType, FareTypes.NonRefundable, StringComparison.OrdinalIgnoreCase) ||
             string.Equals(fareType, FareTypes.NonRefundable, StringComparison.OrdinalIgnoreCase)))
        {
            return Build(nonRefundable);
        }

        // 3) Grace period — measured from when the booking was made.
        if (hoursSinceBooking <= settings.GracePeriodHours)
        {
            var grace = Best(rules, PolicyTiers.Grace, fareType, airline);
            if (grace is not null) return Build(grace);
            return Fallback(settings, PolicyTiers.Grace, "No grace-period rule is configured", fareType, airline,
                departure, hoursSinceBooking, hoursBeforeDeparture, pastDeparture);
        }

        // 4) Early / late, by hours remaining before departure.
        var windowed = rules
            .Where(r => (r.PolicyTier == PolicyTiers.Early || r.PolicyTier == PolicyTiers.Late) &&
                        AppliesTo(r, fareType, airline) &&
                        InWindow(r, hoursBeforeDeparture))
            .OrderByDescending(r => r.Priority)
            .ThenByDescending(r => r.MaxHoursBeforeDeparture)
            .ThenBy(r => r.Id)
            .FirstOrDefault();
        if (windowed is not null) return Build(windowed);

        return Fallback(settings, PolicyTiers.Late, "No cancellation window rule covers this departure", fareType,
            airline, departure, hoursSinceBooking, hoursBeforeDeparture, pastDeparture);
    }

    /// <summary>A gap in the configuration must never become a free refund.</summary>
    private static PolicyMatch Fallback(
        CancellationPolicySettings settings,
        string tier,
        string reason,
        string fareType,
        string airline,
        DateTime? departure,
        int hoursSinceBooking,
        int hoursBeforeDeparture,
        bool pastDeparture) =>
        new(settings, null, tier, RequiresApproval: true, RefundResolutions.None, IsNonRefundable: false,
            pastDeparture, departure, hoursSinceBooking, hoursBeforeDeparture, fareType, airline, reason);

    private static bool InWindow(CancellationPolicyRule rule, int hoursBeforeDeparture)
    {
        if (hoursBeforeDeparture < rule.MinHoursBeforeDeparture) return false;
        if (rule.MaxHoursBeforeDeparture <= 0) return true;
        return hoursBeforeDeparture < rule.MaxHoursBeforeDeparture;
    }

    private static bool AppliesTo(CancellationPolicyRule rule, string fareType, string airline) =>
        (string.IsNullOrWhiteSpace(rule.Airline) || Matches(rule.Airline, airline)) &&
        (string.IsNullOrWhiteSpace(rule.FareType) || Matches(rule.FareType, fareType));

    private static CancellationPolicyRule? Best(List<CancellationPolicyRule> rules, string tier, string fareType, string airline) =>
        rules.Where(r => r.PolicyTier == tier && AppliesTo(r, fareType, airline))
            .OrderByDescending(r => r.Priority)
            .ThenBy(r => r.Id)
            .FirstOrDefault();

    private static bool Matches(string configured, string actual) =>
        !string.IsNullOrWhiteSpace(actual) &&
        (configured.Equals(actual, StringComparison.OrdinalIgnoreCase) ||
         actual.Contains(configured, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// A rule may pin its own approval requirement, otherwise the agency-wide
    /// setting for that tier decides (grace can auto-approve, late/no-show/
    /// non-refundable normally cannot).
    /// </summary>
    public static bool RequiresApprovalFor(CancellationPolicyRule rule, CancellationPolicySettings settings)
    {
        if (rule.RequiresApproval.HasValue) return rule.RequiresApproval.Value;
        return rule.PolicyTier switch
        {
            PolicyTiers.Grace => !settings.AutoApproveGracePeriod,
            PolicyTiers.Late => settings.RequireApprovalLateCancellation,
            PolicyTiers.NoShow => settings.RequireApprovalNoShow,
            PolicyTiers.NonRefundable => settings.RequireApprovalNonRefundable,
            _ => false
        };
    }

    /// <summary>The primary airline of the booking, used to match airline-specific rules.</summary>
    public static Task<string> ResolveAirlineAsync(Booking booking, CancellationToken ct = default) =>
        Task.FromResult(booking.BookingFlights?
            .Where(f => !string.IsNullOrWhiteSpace(f.Airline))
            .OrderBy(f => f.SegmentOrder)
            .Select(f => f.Airline.Trim())
            .FirstOrDefault() ?? string.Empty);

    /// <summary>The exact default policy an agency starts with (also used by tests).</summary>
    public static class Defaults
    {
        public static CancellationPolicySettings Settings() => new()
        {
            Name = "Default Cancellation Policy",
            GracePeriodHours = 24,
            AutoApproveGracePeriod = true,
            RequireApprovalLateCancellation = true,
            RequireApprovalNoShow = true,
            RequireApprovalNonRefundable = true,
            NonRefundableResolution = RefundResolutions.TravelCredit,
            AllowTravelCredit = true,
            TravelCreditValidityMonths = 12,
            AllowAmountOverride = true,
            MaxRefundOverridePercent = 100m,
            RequireCancellationReason = true,
            Currency = "PHP",
            IsActive = true,
            Notes = "Seeded defaults: 24h grace, 15% airline penalty on early cancellations."
        };

        /// <summary>
        /// The default rule set. The numbers mirror the worked example in the
        /// business rule (₱10,000 − ₱1,500 airline − ₱500 agency − ₱100 payment
        /// = ₱7,900) and are all editable by an administrator.
        /// </summary>
        public static List<CancellationPolicyRule> Rules() =>
        [
            new CancellationPolicyRule
            {
                Name = "Grace period — 100% refund",
                PolicyTier = PolicyTiers.Grace,
                RefundPercentage = 100,
                RequiresApproval = false,
                Resolution = RefundResolutions.Cash,
                Priority = 100,
                Notes = "Cancelled within the agency grace period after booking."
            },
            new CancellationPolicyRule
            {
                Name = "Early cancellation (7+ days before departure)",
                PolicyTier = PolicyTiers.Early,
                MinHoursBeforeDeparture = 168,
                MaxHoursBeforeDeparture = 0,
                RefundPercentage = 100,
                AirlineFeePercent = 15m,
                AgencyServiceFee = 500m,
                PaymentProcessingFee = 100m,
                RequiresApproval = false,
                Resolution = RefundResolutions.Cash,
                Priority = 50
            },
            new CancellationPolicyRule
            {
                Name = "Late cancellation (3–7 days before departure)",
                PolicyTier = PolicyTiers.Late,
                MinHoursBeforeDeparture = 72,
                MaxHoursBeforeDeparture = 168,
                RefundPercentage = 75,
                AirlineFeePercent = 5m,
                AgencyServiceFee = 500m,
                PaymentProcessingFee = 100m,
                RequiresApproval = true,
                Resolution = RefundResolutions.Cash,
                Priority = 40
            },
            new CancellationPolicyRule
            {
                Name = "Very late cancellation (under 3 days before departure)",
                PolicyTier = PolicyTiers.Late,
                MinHoursBeforeDeparture = 0,
                MaxHoursBeforeDeparture = 72,
                RefundPercentage = 60,
                AirlineFeePercent = 5m,
                AgencyServiceFee = 500m,
                PaymentProcessingFee = 100m,
                RequiresApproval = true,
                Resolution = RefundResolutions.Cash,
                Priority = 30
            },
            new CancellationPolicyRule
            {
                Name = "Non-refundable fare — travel credit only",
                PolicyTier = PolicyTiers.NonRefundable,
                FareType = FareTypes.NonRefundable,
                RefundPercentage = 0,
                IsNonRefundable = true,
                RequiresApproval = true,
                Resolution = RefundResolutions.TravelCredit,
                Priority = 90,
                Notes = "Cash refund is ₱0; staff may issue travel credit as an exception."
            },
            new CancellationPolicyRule
            {
                Name = "No-show / departure already passed",
                PolicyTier = PolicyTiers.NoShow,
                RefundPercentage = 0,
                RequiresApproval = true,
                Resolution = RefundResolutions.None,
                Priority = 110,
                Notes = "Any exception requires manual staff approval."
            }
        ];
    }
}
