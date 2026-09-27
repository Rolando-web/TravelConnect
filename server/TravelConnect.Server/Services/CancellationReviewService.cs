using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Services;

/// <summary>Outcome of a staff decision, including anything that changed on the booking.</summary>
public record ReviewDecision(
    BookingCancellation Cancellation,
    Booking? Booking,
    BookingRefund? Refund,
    string Message);

/// <summary>
/// The staff side of the review queue. A request that the policy could not
/// auto-approve waits here until a manager approves or rejects it.
///
/// Two rules shape everything in this file:
///  - the money is whatever was frozen when the customer asked. Staff may change
///    the resolution (cash / travel credit / no refund) and, with the explicit
///    override permission, the amount — but the change is flagged as an exception
///    so an audit can tell an approved refund from a corrected one.
///  - a decision is final. Re-approving or re-rejecting the same request is
///    refused rather than quietly re-running the money movement.
/// </summary>
public class CancellationReviewService(TravelConnectDbContext db, CancellationQuoteService quotes)
{
    /// <summary>Hard ceiling on a queue page, so a client cannot ask for the whole table.</summary>
    public const int MaxPageSize = 100;

    /// <summary>
    /// The page actually queried, so the caller can echo the normalised values
    /// instead of the raw query string (which may have been 0, negative or oversized).
    /// </summary>
    public record ReviewPage(
        IReadOnlyList<BookingCancellation> Items,
        int Total,
        int Page,
        int PageSize);

    public static readonly string[] Resolutions =
    [
        RefundResolutions.Cash,
        RefundResolutions.TravelCredit,
        RefundResolutions.None,
    ];

    /// <summary>
    /// The review queue. "pending" is the default view (open requests, oldest
    /// first, because whoever has waited longest gets answered first); an explicit
    /// status lists that slice newest first, which is how an auditor reads it.
    /// </summary>
    public async Task<ReviewPage> ListAsync(
        string? status,
        string? search,
        int page = 1,
        int pageSize = 25,
        CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? 25 : Math.Min(pageSize, MaxPageSize);

        var query = db.BookingCancellations.AsNoTracking().Include(c => c.Booking).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("pending", StringComparison.OrdinalIgnoreCase))
        {
            var wanted = status.Trim();
            query = query.Where(c => c.Status == wanted);
        }
        else
        {
            query = query.Where(c => c.Status == CancellationStatuses.Requested);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(c =>
                c.Reference.Contains(term) ||
                c.CustomerEmail.Contains(term) ||
                c.CustomerName.Contains(term) ||
                (c.Booking != null && c.Booking.ReferenceNumber.Contains(term)));
        }

        var total = await query.CountAsync(ct);
        var pendingView = string.IsNullOrWhiteSpace(status) || status.Equals("pending", StringComparison.OrdinalIgnoreCase);

        var items = await query
            .OrderBy(c => pendingView ? c.RequestedAt : c.DecidedAt ?? c.RequestedAt)
            .ThenBy(c => pendingView ? c.Id : -c.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new ReviewPage(items, total, page, pageSize);
    }

    public async Task<BookingCancellation?> GetAsync(int cancellationId, CancellationToken ct = default) =>
        await db.BookingCancellations
            .Include(c => c.Booking)
            .ThenInclude(b => b!.BookingFlights)
            .Include(c => c.Refunds)
            .FirstOrDefaultAsync(c => c.Id == cancellationId, ct);

    /// <summary>
    /// Approves a queued request. The refund it raises is the frozen amount unless
    /// a manager with the override permission deliberately changes it.
    /// </summary>
    public async Task<ReviewDecision> ApproveAsync(
        int cancellationId,
        StaffActor actor,
        string? notes = null,
        string? resolutionOverride = null,
        decimal? refundAmountOverride = null,
        DateTime? at = null,
        CancellationToken ct = default)
    {
        RequireApprovalPermission(actor);

        var (cancellation, booking) = await LoadQueuedAsync(cancellationId, ct);
        var now = at ?? DateTime.UtcNow;

        var quotedResolution = cancellation.Resolution;
        var resolution = quotedResolution;
        if (!string.IsNullOrWhiteSpace(resolutionOverride))
        {
            resolution = resolutionOverride.Trim().ToLowerInvariant();
            if (!Resolutions.Contains(resolution))
                throw new ArgumentException($"Unknown refund resolution '{resolutionOverride}'.", nameof(resolutionOverride));

            // Leaving the cash quote as travel credit is just as much a departure
            // from the policy as moving money, so it is flagged and audited too.
            if (resolution != quotedResolution) cancellation.IsException = true;
        }

        if (refundAmountOverride.HasValue)
        {
            if (!actor.CanOverrideRefundAmount)
                throw new UnauthorizedAccessException("You do not have permission to change a refund amount.");
            if (refundAmountOverride.Value < 0m)
                throw new ArgumentException("A refund cannot be negative.", nameof(refundAmountOverride));
            if (refundAmountOverride.Value > cancellation.OriginalAmount)
                throw new ArgumentException("A refund cannot exceed the amount originally paid.", nameof(refundAmountOverride));

            if (refundAmountOverride.Value != cancellation.RefundAmount) cancellation.IsException = true;
            cancellation.RefundAmount = refundAmountOverride.Value;
        }

        // A "no refund" resolution pays nothing, whatever the amount says.
        if (resolution == RefundResolutions.None)
        {
            if (cancellation.RefundAmount != 0m) cancellation.IsException = true;
            cancellation.RefundAmount = 0m;
        }

        if (!string.IsNullOrWhiteSpace(notes)) cancellation.Notes = Append(cancellation.Notes, notes);
        if (!string.IsNullOrWhiteSpace(resolutionOverride))
        {
            // Always recorded, even when the manager simply re-confirmed the quote.
            cancellation.Notes = Append(
                cancellation.Notes,
                resolution == quotedResolution
                    ? $"Resolution {resolution} confirmed by {actor.Email}."
                    : $"Resolution changed from {quotedResolution} to {resolution} by {actor.Email}.");
        }

        var refund = await quotes.CompleteAsync(booking, cancellation, resolution, now, actor.Email, ct);

        return new ReviewDecision(
            cancellation,
            booking,
            refund,
            refund is null
                ? "Cancellation approved. This booking is not refundable under the current policy."
                : $"Cancellation approved. A refund of {refund.Amount:0.00} is queued for processing.");
    }

    /// <summary>
    /// Rejects a queued request: the decision is recorded, any pending refund is
    /// voided and the booking goes back to being usable. The customer sees the
    /// reason they were given.
    /// </summary>
    public async Task<ReviewDecision> RejectAsync(
        int cancellationId,
        StaffActor actor,
        string reason,
        DateTime? at = null,
        CancellationToken ct = default)
    {
        RequireApprovalPermission(actor);

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("A rejection needs a reason the customer can be told.", nameof(reason));

        var (cancellation, booking) = await LoadQueuedAsync(cancellationId, ct);
        var now = at ?? DateTime.UtcNow;

        cancellation.Status = CancellationStatuses.Rejected;
        cancellation.DecidedAt = now;
        cancellation.ApprovedBy = actor.Email; // the decider, whoever they are
        cancellation.ApprovedAt = null;
        cancellation.RejectionReason = reason.Trim();
        cancellation.RequiresApproval = false;
        cancellation.Notes = Append(cancellation.Notes, $"Rejected by {actor.Email}: {cancellation.RejectionReason}");

        // A rejected request must not leave money or a promise behind.
        foreach (var refund in cancellation.Refunds.Where(r => r.Status == RefundStatuses.Pending))
        {
            refund.Status = RefundStatuses.Voided;
            refund.Notes = Append(refund.Notes, "Voided because the cancellation request was rejected.");
        }

        if (booking.ActiveCancellationId == cancellation.Id) booking.ActiveCancellationId = null;
        booking.CancellationStatus = CancellationStatuses.Rejected;
        booking.RefundAmount = 0m;
        booking.RefundReference = string.Empty;
        booking.Paid = booking.TotalAmount > 0m ? booking.Paid : false;
        booking.Status = Departed(booking, now) ? BookingStatusValues.Completed : BookingStatusValues.Upcoming;
        booking.UpdatedAt = now;

        await db.SaveChangesAsync(ct);

        return new ReviewDecision(
            cancellation,
            booking,
            null,
            "Cancellation request rejected. The booking remains active and no refund is due.");
    }

    /// <summary>
    /// Has this journey already left? Uses the same departure resolution as the
    /// policy engine, so a rejected request cannot leave a booking stranded in
    /// "upcoming" for a flight that departed weeks ago.
    /// </summary>
    private static bool Departed(Booking booking, DateTime now) =>
        BookingDeparture.Resolve(booking) is { } departure && departure <= now;

    private async Task<(BookingCancellation Cancellation, Booking Booking)> LoadQueuedAsync(
        int cancellationId,
        CancellationToken ct)
    {
        var cancellation = await db.BookingCancellations
            .Include(c => c.Refunds)
            .FirstOrDefaultAsync(c => c.Id == cancellationId, ct)
            ?? throw new KeyNotFoundException($"Cancellation request {cancellationId} was not found.");

        if (cancellation.Status != CancellationStatuses.Requested)
            throw new InvalidOperationException(
                $"This request was already {cancellation.Status} and cannot be decided again.");

        var booking = await db.Bookings
            .Include(b => b.BookingFlights)
            .FirstOrDefaultAsync(b => b.Id == cancellation.BookingId, ct)
            ?? throw new InvalidOperationException("The booking behind this request no longer exists.");

        if (CancellationQuoteService.IsTerminalBookingStatus(booking.Status))
            throw new InvalidOperationException("This booking has already been cancelled or refunded.");

        return (cancellation, booking);
    }

    private static void RequireApprovalPermission(StaffActor actor)
    {
        if (!actor.CanApproveCancellation)
            throw new UnauthorizedAccessException("You do not have permission to decide cancellation requests.");
    }

    private static string Append(string existing, string addition) =>
        string.IsNullOrWhiteSpace(existing) ? addition.Trim() : $"{existing.Trim()}\n{addition.Trim()}";
}
