namespace TravelConnect.Server.Models;

/// <summary>
/// Policy tiers. A booking is matched to exactly one tier, and the tier is
/// snapshotted onto the cancellation so a later policy edit never changes a
/// decision that was already made.
/// </summary>
public static class PolicyTiers
{
    public const string Grace = "grace";
    public const string Early = "early";
    public const string Late = "late";
    public const string NonRefundable = "non-refundable";
    public const string NoShow = "no-show";

    public static readonly IReadOnlyList<string> All = [Grace, Early, Late, NonRefundable, NoShow];

    public static bool IsValid(string? tier) =>
        !string.IsNullOrWhiteSpace(tier) &&
        All.Any(t => string.Equals(t, tier, StringComparison.OrdinalIgnoreCase));

    public static string Label(string? tier) => tier switch
    {
        Grace => "Grace period (100% refund)",
        Early => "Early cancellation",
        Late => "Late cancellation",
        NonRefundable => "Non-refundable fare",
        NoShow => "No-show / past departure",
        _ => "Unclassified"
    };

    public static string CheckConstraintSql(string column = "PolicyTier") =>
        $"{column} IN ({string.Join(", ", All.Select(t => $"'{t}'"))})";
}

/// <summary>
/// Agency-wide switches for the cancellation &amp; refund workflow. Exactly one
/// row is active at a time (<see cref="IsActive"/>) and it is the only place
/// that decides the grace period, which situations need a human decision, and
/// whether staff may override a calculated refund.
/// </summary>
public class CancellationPolicySettings : BaseEntity
{
    public string Name { get; set; } = "Default Cancellation Policy";

    /// <summary>Hours after booking during which a cancellation is fully refunded.</summary>
    public int GracePeriodHours { get; set; } = 24;
    public bool AutoApproveGracePeriod { get; set; } = true;

    public bool RequireApprovalLateCancellation { get; set; } = true;
    public bool RequireApprovalNoShow { get; set; } = true;
    public bool RequireApprovalNonRefundable { get; set; } = true;

    /// <summary>How a non-refundable fare is settled when staff approve an exception.</summary>
    public string NonRefundableResolution { get; set; } = RefundResolutions.TravelCredit;
    public bool AllowTravelCredit { get; set; } = true;
    public int TravelCreditValidityMonths { get; set; } = 12;

    /// <summary>Whether staff may adjust the calculated refund amount by hand.</summary>
    public bool AllowAmountOverride { get; set; } = true;
    /// <summary>Ceiling for a manual amount, as a percentage of the original booking amount.</summary>
    public decimal MaxRefundOverridePercent { get; set; } = 100m;

    public bool RequireCancellationReason { get; set; } = true;
    public string Currency { get; set; } = "PHP";

    public bool IsActive { get; set; } = true;
    public string Notes { get; set; } = string.Empty;
    public string UpdatedBy { get; set; } = string.Empty;
}

/// <summary>
/// One configurable cancellation rule: which tier it covers, which airline or
/// fare it applies to, the departure window, the refund percentage and every fee
/// that gets deducted. All refund numbers in the system come from a rule — none
/// are hard-coded in a controller.
/// </summary>
public class CancellationPolicyRule : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string PolicyTier { get; set; } = PolicyTiers.Early;

    /// <summary>Airline name filter; empty means "any airline".</summary>
    public string Airline { get; set; } = string.Empty;
    /// <summary>Fare-type filter; empty means "any fare".</summary>
    public string FareType { get; set; } = string.Empty;

    /// <summary>Inclusive lower bound of the hours-before-departure window.</summary>
    public int MinHoursBeforeDeparture { get; set; }
    /// <summary>Exclusive upper bound; 0 means "no upper bound".</summary>
    public int MaxHoursBeforeDeparture { get; set; }

    public int RefundPercentage { get; set; }
    public decimal AirlineFeePercent { get; set; }
    public decimal AirlineFeeAmount { get; set; }
    public decimal AgencyServiceFee { get; set; }
    public decimal PaymentProcessingFee { get; set; }
    public decimal OtherFee { get; set; }

    public bool IsNonRefundable { get; set; }
    /// <summary>null = inherit the agency-wide setting for this tier.</summary>
    public bool? RequiresApproval { get; set; }
    public string Resolution { get; set; } = RefundResolutions.Cash;

    /// <summary>Higher wins when several rules match; more specific rules should rank higher.</summary>
    public int Priority { get; set; }
    public bool IsActive { get; set; } = true;
    public string Notes { get; set; } = string.Empty;
}
