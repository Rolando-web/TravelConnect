using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Services;

/// <summary>Outcome of one finance action, so the controller never has to guess the message.</summary>
public record RefundActionResult(
    BookingRefund Refund,
    Booking Booking,
    BookingCancellation? Cancellation,
    string Message);

/// <summary>
/// The payout side of a cancellation. The cancellation decision (Phases 1-4) only
/// promises money; this service is the only place that actually moves it, and it
/// walks the status vocabulary that the database CHECK constraint pins:
/// <c>Pending → Approved → Processing → Completed</c>, with <c>Failed</c> as a
/// re-attemptable state. Every transition is checked against
/// <see cref="RefundStatuses.CanTransition"/>, so an out-of-order action is refused
/// instead of silently overwriting history.
/// </summary>
public class RefundProcessingService(TravelConnectDbContext db)
{
    public const int MaxPageSize = 100;

    public record RefundPage(
        IReadOnlyList<BookingRefund> Items,
        int Total,
        int Page,
        int PageSize);

    /// <summary>Money that never touches a payment provider (a travel credit is a ledger entry).</summary>
    private const string TravelCreditMethod = "travel-credit";

    // ── queue ───────────────────────────────────────────────────────

    public async Task<RefundPage> ListAsync(
        string? status,
        string? search,
        int page = 1,
        int pageSize = 25,
        CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? 25 : Math.Min(pageSize, MaxPageSize);

        var query = db.BookingRefunds.AsNoTracking().Include(r => r.Cancellation).AsQueryable();

        if (string.IsNullOrWhiteSpace(status) || status.Equals("open", StringComparison.OrdinalIgnoreCase))
        {
            // The work view: everything finance still has to act on, oldest promise first.
            query = query.Where(r =>
                r.Status == RefundStatuses.Pending ||
                r.Status == RefundStatuses.Approved ||
                r.Status == RefundStatuses.Processing ||
                r.Status == RefundStatuses.Failed);
        }
        else if (RefundStatuses.IsValid(status))
        {
            var wanted = status.Trim();
            query = query.Where(r => r.Status == wanted);
        }
        else
        {
            throw new ArgumentException($"Unknown refund status '{status}'.", nameof(status));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(r =>
                r.Reference.Contains(term) ||
                r.RefundReference.Contains(term) ||
                (r.Cancellation != null &&
                    (r.Cancellation.Reference.Contains(term) ||
                     r.Cancellation.CustomerEmail.Contains(term) ||
                     r.Cancellation.CustomerName.Contains(term))));
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderBy(r => r.CreatedAt)
            .ThenBy(r => r.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new RefundPage(items, total, page, pageSize);
    }

    public async Task<BookingRefund?> GetAsync(int refundId, CancellationToken ct = default) =>
        await db.BookingRefunds
            .Include(r => r.Booking)
            .Include(r => r.Cancellation)
            .Include(r => r.Payment)
            .FirstOrDefaultAsync(r => r.Id == refundId, ct);

    // ── actions ─────────────────────────────────────────────────────

    /// <summary>
    /// Finance releases the money: the request is approved, the booking is now
    /// waiting on a payout, and the originating payment row is linked so the
    /// refund can be reconciled against the money that actually came in.
    /// </summary>
    public async Task<RefundActionResult> ReleaseAsync(
        int refundId,
        StaffActor actor,
        string? notes = null,
        DateTime? at = null,
        CancellationToken ct = default)
    {
        var (refund, booking, cancellation) = await LoadAsync(refundId, actor, RefundStatuses.Approved, ct);
        var now = at ?? DateTime.UtcNow;

        refund.Status = RefundStatuses.Approved;
        refund.ApprovedBy = actor.Email;
        refund.ApprovedAt = now;
        if (!string.IsNullOrWhiteSpace(notes)) refund.Notes = Append(refund.Notes, notes);

        // Reconciliation link. The refund settles a specific payment, and until
        // PaymentId is filled in the payments report cannot show where the money went.
        if (refund.PaymentId is null)
        {
            var payment = await db.Payments
                .Where(p => p.BookingId == booking.Id && p.Status != "Failed")
                .OrderByDescending(p => p.Id)
                .FirstOrDefaultAsync(ct);

            if (payment is not null) refund.PaymentId = payment.Id;
        }

        refund.Notes = Append(
            refund.Notes,
            $"Refund released by {actor.Email} on {now:yyyy-MM-dd}.");

        Mirror(refund, booking, cancellation);
        await db.SaveChangesAsync(ct);

        return new RefundActionResult(
            refund,
            booking,
            cancellation,
            $"Refund {refund.Reference} released for payout.");
    }

    /// <summary>Finance has sent the money and is waiting for the provider to confirm.</summary>
    public async Task<RefundActionResult> StartAsync(
        int refundId,
        StaffActor actor,
        string? refundReference = null,
        string? notes = null,
        DateTime? at = null,
        CancellationToken ct = default)
    {
        var (refund, booking, cancellation) = await LoadAsync(refundId, actor, RefundStatuses.Processing, ct);
        var now = at ?? DateTime.UtcNow;

        refund.Status = RefundStatuses.Processing;
        refund.ProcessedAt = now;
        if (!string.IsNullOrWhiteSpace(refundReference)) refund.RefundReference = refundReference.Trim();
        if (!string.IsNullOrWhiteSpace(notes)) refund.Notes = Append(refund.Notes, notes);
        refund.Notes = Append(refund.Notes, $"Payout started by {actor.Email} on {now:yyyy-MM-dd}.");

        Mirror(refund, booking, cancellation);
        await db.SaveChangesAsync(ct);

        return new RefundActionResult(
            refund,
            booking,
            cancellation,
            $"Refund {refund.Reference} is being processed.");
    }

    /// <summary>
    /// The money reached the customer. A cash payout must carry the provider or
    /// remittance reference — a completed refund with no trace is exactly the kind
    /// of unprovable record this module refuses to create. A travel credit has no
    /// provider, so it completes on the ledger entry alone.
    /// </summary>
    public async Task<RefundActionResult> CompleteAsync(
        int refundId,
        StaffActor actor,
        string? refundReference = null,
        string? notes = null,
        DateTime? at = null,
        CancellationToken ct = default)
    {
        var (refund, booking, cancellation) = await LoadAsync(refundId, actor, RefundStatuses.Completed, ct);
        var now = at ?? DateTime.UtcNow;

        var reference = refundReference?.Trim();
        if (string.IsNullOrWhiteSpace(reference)) reference = refund.RefundReference;

        if (string.IsNullOrWhiteSpace(reference) && !IsLedgerMethod(refund.Method))
            throw new ArgumentException(
                "A cash refund needs the provider or remittance reference before it can be completed.",
                nameof(refundReference));

        if (refund.Amount <= 0m)
            throw new InvalidOperationException("A refund of zero has nothing to settle.");

        refund.Status = RefundStatuses.Completed;
        refund.CompletedAt = now;
        if (!string.IsNullOrWhiteSpace(reference)) refund.RefundReference = reference;
        if (!string.IsNullOrWhiteSpace(notes)) refund.Notes = Append(refund.Notes, notes);
        refund.Notes = Append(refund.Notes, $"Refund completed by {actor.Email} on {now:yyyy-MM-dd}.");

        // The booking stops being a live cancellation and starts being a settled
        // refund, and the money is definitely not still owed on the booking.
        booking.Paid = false;
        booking.RefundAmount = refund.Amount;
        booking.RefundReference = refund.RefundReference;
        booking.CancelledAt ??= now;

        Mirror(refund, booking, cancellation);
        await MarkPaymentRefundedAsync(refund, booking, now, ct);
        await db.SaveChangesAsync(ct);

        return new RefundActionResult(
            refund,
            booking,
            cancellation,
            IsLedgerMethod(refund.Method)
                ? $"Travel credit of {refund.Amount:0.00} issued and closed."
                : $"Refund of {refund.Amount:0.00} completed.");
    }

    /// <summary>
    /// The payout did not go through. The money is still owed, so the booking is
    /// flagged as failed rather than settled, and the reason is kept for the retry.
    /// </summary>
    public async Task<RefundActionResult> FailAsync(
        int refundId,
        StaffActor actor,
        string reason,
        string? notes = null,
        DateTime? at = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("A failed payout needs a reason finance can act on.", nameof(reason));

        var (refund, booking, cancellation) = await LoadAsync(refundId, actor, RefundStatuses.Failed, ct);
        var now = at ?? DateTime.UtcNow;

        refund.Status = RefundStatuses.Failed;
        refund.FailureReason = reason.Trim();
        refund.CompletedAt = null;
        if (!string.IsNullOrWhiteSpace(notes)) refund.Notes = Append(refund.Notes, notes);
        refund.Notes = Append(refund.Notes, $"Payout failed ({refund.FailureReason}) reported by {actor.Email}.");

        Mirror(refund, booking, cancellation);
        await db.SaveChangesAsync(ct);

        return new RefundActionResult(
            refund,
            booking,
            cancellation,
            $"Refund {refund.Reference} failed and is waiting for another attempt.");
    }

    /// <summary>Re-attempts a failed payout. The earlier failure is kept in the trail.</summary>
    public async Task<RefundActionResult> RetryAsync(
        int refundId,
        StaffActor actor,
        string? notes = null,
        DateTime? at = null,
        CancellationToken ct = default)
    {
        var (refund, booking, cancellation) = await LoadAsync(refundId, actor, RefundStatuses.Processing, ct);
        var now = at ?? DateTime.UtcNow;

        var previous = refund.FailureReason;
        refund.Status = RefundStatuses.Processing;
        refund.FailureReason = string.Empty;
        refund.ProcessedAt = now;
        if (!string.IsNullOrWhiteSpace(notes)) refund.Notes = Append(refund.Notes, notes);
        refund.Notes = Append(
            refund.Notes,
            $"Retried by {actor.Email} on {now:yyyy-MM-dd}" + (string.IsNullOrWhiteSpace(previous) ? "." : $" after: {previous}."));

        Mirror(refund, booking, cancellation);
        await db.SaveChangesAsync(ct);

        return new RefundActionResult(
            refund,
            booking,
            cancellation,
            $"Refund {refund.Reference} is being processed again.");
    }

    // ── helpers ─────────────────────────────────────────────────────

    /// <summary>
    /// Loads the refund and proves the requested move is legal before a single
    /// field is written, so a refused action leaves no partial state behind.
    /// </summary>
    private async Task<(BookingRefund Refund, Booking Booking, BookingCancellation? Cancellation)> LoadAsync(
        int refundId,
        StaffActor actor,
        string target,
        CancellationToken ct)
    {
        if (!actor.CanManageRefunds)
            throw new UnauthorizedAccessException("You do not have permission to process refunds.");

        var refund = await db.BookingRefunds
            .Include(r => r.Cancellation)
            .FirstOrDefaultAsync(r => r.Id == refundId, ct)
            ?? throw new KeyNotFoundException($"Refund {refundId} was not found.");

        if (!RefundStatuses.CanTransition(refund.Status, target))
            throw new InvalidOperationException(
                refund.Status == target
                    ? $"This refund is already {refund.Status}."
                    : $"A {refund.Status} refund cannot move to {target}. Allowed: {string.Join(", ", RefundStatuses.AllowedTransitions(refund.Status))}.");

        if (refund.Cancellation is { Status: CancellationStatuses.Rejected })
            throw new InvalidOperationException("This cancellation was rejected, so its refund must stay voided.");

        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == refund.BookingId, ct)
            ?? throw new InvalidOperationException("The booking behind this refund no longer exists.");

        return (refund, booking, refund.Cancellation);
    }

    /// <summary>
    /// Keeps the denormalised mirrors honest. <c>Booking.RefundStatus</c> had no
    /// writer before this service; now the customer-facing booking row always
    /// names the state of the money.
    /// </summary>
    private static void Mirror(BookingRefund refund, Booking booking, BookingCancellation? cancellation)
    {
        booking.RefundStatus = refund.Status;
        booking.UpdatedAt = DateTime.UtcNow;

        var (bookingStatus, cancellationStatus) = refund.Status switch
        {
            RefundStatuses.Pending => (BookingStatusValues.Cancelled, CancellationStatuses.Approved),
            RefundStatuses.Approved => (BookingStatusValues.RefundPending, CancellationStatuses.RefundPending),
            RefundStatuses.Processing => (BookingStatusValues.RefundProcessing, CancellationStatuses.RefundProcessing),
            RefundStatuses.Completed => (BookingStatusValues.Refunded, CancellationStatuses.Refunded),
            RefundStatuses.Failed => (BookingStatusValues.RefundFailed, CancellationStatuses.RefundFailed),
            _ => (booking.Status, booking.CancellationStatus),
        };

        booking.Status = bookingStatus;
        booking.CancellationStatus = cancellationStatus;

        if (cancellation is not null) cancellation.Status = cancellationStatus;
    }

    /// <summary>
    /// Marks the payment refunded only when the whole amount came back. A partial
    /// refund leaves the payment alone rather than pretending the customer was made
    /// whole in cash; the refund row is the record of what was actually returned.
    /// </summary>
    private async Task MarkPaymentRefundedAsync(BookingRefund refund, Booking booking, DateTime now, CancellationToken ct)
    {
        if (refund.PaymentId is null)
        {
            var payment = await db.Payments
                .Where(p => p.BookingId == booking.Id && p.Status != "Failed")
                .OrderByDescending(p => p.Id)
                .FirstOrDefaultAsync(ct);

            if (payment is null) return;
            refund.PaymentId = payment.Id;
        }

        var linked = await db.Payments.FirstOrDefaultAsync(p => p.Id == refund.PaymentId, ct);
        if (linked is null) return;

        if (refund.Amount >= linked.Amount && linked.Status != "Refunded")
        {
            linked.Status = "Refunded";
            linked.UpdatedAt = now;
        }
        else if (refund.Amount < linked.Amount)
        {
            refund.Notes = Append(
                refund.Notes,
                $"Partial settlement: {refund.Amount:0.00} of {linked.Amount:0.00} paid by {linked.Method}. Payment {linked.ReferenceId} left open.");
        }
    }

    private static bool IsLedgerMethod(string? method) =>
        string.Equals(method, TravelCreditMethod, StringComparison.OrdinalIgnoreCase);

    private static string Append(string existing, string addition) =>
        string.IsNullOrWhiteSpace(existing) ? addition.Trim() : $"{existing.Trim()}\n{addition.Trim()}";
}
