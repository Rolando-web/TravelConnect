namespace TravelConnect.Server.Models;

/// <summary>
/// The single source of truth for every status the cancellation / refund
/// workflow can be in. Controllers, services, the database DDL, the admin UI
/// and the customer UI all read these constants, so the vocabulary can never
/// drift between layers (and the transition map below is what stops an
/// "approved" refund from silently jumping to "completed", or a booked trip
/// from being cancelled twice).
/// </summary>
public static class CancellationStatuses
{
    public const string Confirmed = "Confirmed";
    public const string Requested = "Cancellation Requested";
    public const string Approved = "Cancellation Approved";
    public const string Rejected = "Cancellation Rejected";
    public const string Cancelled = "Cancelled";
    public const string RefundPending = "Refund Pending";
    public const string RefundApproved = "Refund Approved";
    public const string RefundProcessing = "Refund Processing";
    public const string Refunded = "Refunded";
    public const string RefundFailed = "Refund Failed";
    public const string NonRefundable = "Non-Refundable";
    public const string NoShow = "No-Show";

    public static readonly IReadOnlyList<string> All =
    [
        Confirmed, Requested, Approved, Rejected, Cancelled, RefundPending,
        RefundApproved, RefundProcessing, Refunded, RefundFailed, NonRefundable, NoShow
    ];

    // Legal forward moves. Anything not listed here is rejected by CanTransition,
    // which is how "prevent invalid transitions" is enforced in one place.
    private static readonly Dictionary<string, string[]> TransitionMap = new(StringComparer.OrdinalIgnoreCase)
    {
        [Confirmed] = [Requested],
        [Requested] = [Approved, Rejected],
        [Approved] = [Cancelled, RefundPending, NonRefundable, NoShow, Refunded],
        [Cancelled] = [RefundPending, Refunded, NonRefundable, NoShow],
        [RefundPending] = [RefundApproved, RefundProcessing, Refunded, RefundFailed, NonRefundable],
        [RefundApproved] = [RefundProcessing, Refunded, RefundFailed],
        [RefundProcessing] = [Refunded, RefundFailed],
        [RefundFailed] = [RefundProcessing],
        [Refunded] = [],
        [Rejected] = [],
        [NonRefundable] = [RefundPending],
        [NoShow] = [RefundPending],
    };

    public static bool IsValid(string? status) =>
        !string.IsNullOrWhiteSpace(status) &&
        All.Any(s => string.Equals(s, status, StringComparison.OrdinalIgnoreCase));

    public static IReadOnlyList<string> AllowedTransitions(string? status) =>
        status is not null && TransitionMap.TryGetValue(status, out var next) ? next : [];

    public static bool CanTransition(string? from, string? to) =>
        AllowedTransitions(from).Any(n => string.Equals(n, to, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// CHECK-constraint body pinning the column to this vocabulary, generated
    /// from <see cref="All"/> so the database and the code can never disagree on
    /// what a legal status is. Used by the DbContext model and by the additive
    /// DDL in DatabaseInitializer.
    /// </summary>
    public static string CheckConstraintSql(string column = "Status") =>
        $"{column} IN ({string.Join(", ", All.Select(s => $"'{s.Replace("'", "''")}'"))})";
}

/// <summary>Status of the money movement itself (one refund per cancellation).</summary>
public static class RefundStatuses
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Processing = "Processing";
    public const string Completed = "Completed";
    public const string Failed = "Failed";
    public const string Rejected = "Rejected";
    public const string Voided = "Voided";

    public static readonly IReadOnlyList<string> All =
        [Pending, Approved, Processing, Completed, Failed, Rejected, Voided];

    private static readonly Dictionary<string, string[]> TransitionMap = new(StringComparer.OrdinalIgnoreCase)
    {
        [Pending] = [Approved, Rejected, Voided],
        [Approved] = [Processing, Completed, Failed],
        [Processing] = [Completed, Failed],
        [Failed] = [Processing],
        [Completed] = [],
        [Rejected] = [],
        [Voided] = [],
    };

    public static bool IsValid(string? status) =>
        !string.IsNullOrWhiteSpace(status) &&
        All.Any(s => string.Equals(s, status, StringComparison.OrdinalIgnoreCase));

    public static IReadOnlyList<string> AllowedTransitions(string? status) =>
        status is not null && TransitionMap.TryGetValue(status, out var next) ? next : [];

    public static bool CanTransition(string? from, string? to) =>
        AllowedTransitions(from).Any(n => string.Equals(n, to, StringComparison.OrdinalIgnoreCase));

    /// <summary>CHECK-constraint body pinning a refund status column to <see cref="All"/>.</summary>
    public static string CheckConstraintSql(string column = "Status") =>
        $"{column} IN ({string.Join(", ", All.Select(s => $"'{s.Replace("'", "''")}'"))})";
}

/// <summary>
/// How a cancellation that is not cash-refundable is settled. Kept as data
/// (not a hard-coded branch) so an agency can switch between travel credit and
/// a documented exception without a code change.
/// </summary>
public static class RefundResolutions
{
    public const string Cash = "cash";
    public const string TravelCredit = "travel-credit";
    public const string None = "none";
}

/// <summary>Fare families the policy rules are matched against.</summary>
public static class FareTypes
{
    public const string Economy = "Economy";
    public const string Flex = "Flex";
    public const string Promo = "Promo";
    public const string NonRefundable = "Non-Refundable";

    public static readonly IReadOnlyList<string> All = [Economy, Flex, Promo, NonRefundable];

    /// <summary>Empty/legacy fare values are treated as the standard economy fare.</summary>
    public static string Normalize(string? fareType) =>
        string.IsNullOrWhiteSpace(fareType) ? Economy : fareType.Trim();
}

/// <summary>
/// Booking-level status values. The legacy four ("upcoming", "completed",
/// "cancelled", "refunded") stay valid so existing bookings, seeds and UI
/// checks keep working; the cancellation workflow adds the intermediate states
/// so a customer can see "Cancellation Requested" instead of a booking that
/// silently jumped to "refunded".
/// </summary>
public static class BookingStatusValues
{
    public const string Upcoming = "upcoming";
    public const string Completed = "completed";
    public const string Cancelled = "cancelled";
    public const string Refunded = "refunded";
    public const string CancellationRequested = "cancellation-requested";
    public const string RefundPending = "refund-pending";
    public const string RefundApproved = "refund-approved";
    public const string RefundProcessing = "refund-processing";
    public const string RefundFailed = "refund-failed";
    public const string NonRefundable = "non-refundable";
    public const string NoShow = "no-show";

    public static readonly IReadOnlyList<string> All =
    [
        Upcoming, Completed, Cancelled, Refunded, CancellationRequested, RefundPending,
        RefundApproved, RefundProcessing, RefundFailed, NonRefundable, NoShow
    ];

    /// <summary>Statuses a customer may still request a cancellation from.</summary>
    public static readonly IReadOnlyList<string> Cancellable = [Upcoming];

    /// <summary>Statuses where the booking is already closed for cancellation.</summary>
    public static bool IsClosed(string? status) =>
        status is not null &&
        (string.Equals(status, Cancelled, StringComparison.OrdinalIgnoreCase) ||
         string.Equals(status, Refunded, StringComparison.OrdinalIgnoreCase) ||
         string.Equals(status, Completed, StringComparison.OrdinalIgnoreCase) ||
         string.Equals(status, NoShow, StringComparison.OrdinalIgnoreCase) ||
         string.Equals(status, NonRefundable, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Projects a cancellation status onto the booking row so booking lists,
    /// the lifecycle service and the customer's My Bookings page all agree.
    /// </summary>
    public static string FromCancellationStatus(string? cancellationStatus) => cancellationStatus switch
    {
        var s when string.Equals(s, CancellationStatuses.Confirmed, StringComparison.OrdinalIgnoreCase) => Upcoming,
        var s when string.Equals(s, CancellationStatuses.Requested, StringComparison.OrdinalIgnoreCase) => CancellationRequested,
        var s when string.Equals(s, CancellationStatuses.Approved, StringComparison.OrdinalIgnoreCase) => RefundPending,
        var s when string.Equals(s, CancellationStatuses.Cancelled, StringComparison.OrdinalIgnoreCase) => Cancelled,
        var s when string.Equals(s, CancellationStatuses.RefundPending, StringComparison.OrdinalIgnoreCase) => RefundPending,
        var s when string.Equals(s, CancellationStatuses.RefundApproved, StringComparison.OrdinalIgnoreCase) => RefundApproved,
        var s when string.Equals(s, CancellationStatuses.RefundProcessing, StringComparison.OrdinalIgnoreCase) => RefundProcessing,
        var s when string.Equals(s, CancellationStatuses.Refunded, StringComparison.OrdinalIgnoreCase) => Refunded,
        var s when string.Equals(s, CancellationStatuses.RefundFailed, StringComparison.OrdinalIgnoreCase) => RefundFailed,
        var s when string.Equals(s, CancellationStatuses.NonRefundable, StringComparison.OrdinalIgnoreCase) => NonRefundable,
        var s when string.Equals(s, CancellationStatuses.NoShow, StringComparison.OrdinalIgnoreCase) => NoShow,
        _ => Upcoming
    };

    /// <summary>True once the booking is inside a cancellation request, so a second
    /// request cannot be opened while one is still being decided.</summary>
    public static bool IsInCancellationFlow(string? status) =>
        status is not null &&
        (string.Equals(status, CancellationRequested, StringComparison.OrdinalIgnoreCase) ||
         string.Equals(status, RefundPending, StringComparison.OrdinalIgnoreCase) ||
         string.Equals(status, RefundApproved, StringComparison.OrdinalIgnoreCase) ||
         string.Equals(status, RefundProcessing, StringComparison.OrdinalIgnoreCase) ||
         string.Equals(status, RefundFailed, StringComparison.OrdinalIgnoreCase));
}
