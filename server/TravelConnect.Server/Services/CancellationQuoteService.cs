using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Services;

/// <summary>
/// The money a customer would get back if they cancelled right now, with every
/// deduction itemised. Returned by the quote endpoint and frozen onto the
/// cancellation record when the request is actually made, so the number the
/// customer saw and the number staff process are the same number.
/// </summary>
public record RefundQuote(
    string Tier,
    string TierLabel,
    int? PolicyRuleId,
    string PolicyName,
    bool RequiresApproval,
    int RefundPercentage,
    decimal OriginalAmount,
    decimal RefundableAmount,
    decimal AirlineCancellationFee,
    decimal AgencyServiceFee,
    decimal PaymentProcessingFee,
    decimal OtherFee,
    decimal TotalFees,
    decimal RefundAmount,
    string Resolution,
    bool IsNonRefundable,
    bool CanRefundCash,
    int HoursSinceBooking,
    int HoursBeforeDeparture,
    DateTime? DepartureAt,
    string? Note,
    DateTime QuotedAt,
    DateTime ValidUntil)
{
    /// <summary>True when the booking is not refundable at all under the current policy.</summary>
    public bool IsRefundable => RefundAmount > 0 && Resolution == RefundResolutions.Cash;
}

/// <summary>
/// Who may read or cancel a given booking. Kept out of the controller so the
/// rule is unit-testable: a signed-in caller must be the customer on the
/// booking, an anonymous caller must present the exact reference number AND the
/// email the booking was made with, and staff may always look.
/// </summary>
public static class BookingOwnership
{
    public static bool IsCustomer(Booking booking, string? tokenEmail) =>
        !string.IsNullOrWhiteSpace(tokenEmail) &&
        booking.CustomerEmail.Equals(tokenEmail.Trim(), StringComparison.OrdinalIgnoreCase);

    public static bool HasProof(Booking booking, string? referenceNumber, string? email) =>
        !string.IsNullOrWhiteSpace(referenceNumber) &&
        !string.IsNullOrWhiteSpace(email) &&
        booking.ReferenceNumber.Equals(referenceNumber.Trim(), StringComparison.OrdinalIgnoreCase) &&
        booking.CustomerEmail.Equals(email.Trim(), StringComparison.OrdinalIgnoreCase);

    public static bool Authorise(Booking booking, string? tokenEmail, bool tokenIsStaff, string? referenceNumber, string? email) =>
        IsCustomer(booking, tokenEmail) || tokenIsStaff || HasProof(booking, referenceNumber, email);
}

public class CancellationQuoteService(TravelConnectDbContext db, CancellationPolicyService policy)
{    /// <summary>A quote is advisory and short-lived; the request always recalculates.</summary>
    public static readonly TimeSpan QuoteValidity = TimeSpan.FromHours(24);

    /// <summary>Status of the customer's most recent cancellation for a booking.</summary>
    public static readonly string[] LiveStatuses =
    [
        CancellationStatuses.Requested,
        CancellationStatuses.Approved,
        CancellationStatuses.Cancelled,
        CancellationStatuses.RefundPending,
        CancellationStatuses.RefundApproved,
        CancellationStatuses.RefundProcessing,
    ];

    public async Task<RefundQuote> QuoteAsync(Booking booking, DateTime? at = null, CancellationToken ct = default)
    {
        var now = at ?? DateTime.UtcNow;
        var match = await policy.ResolveAsync(booking, now, ct);
        return Build(booking, match, now);
    }

    public async Task<(RefundQuote Quote, PolicyMatch Match)> MatchAsync(
        Booking booking, DateTime? at = null, CancellationToken ct = default)
    {
        var now = at ?? DateTime.UtcNow;
        var match = await policy.ResolveAsync(booking, now, ct);
        return (Build(booking, match, now), match);
    }

    private static RefundQuote Build(Booking booking, PolicyMatch match, DateTime now)
    {
        var rule = match.Rule;
        var original = booking.TotalAmount;

        // Refundable base: the percentage of the booking the customer earns back
        // before the agency/airline fees are deducted from it.
        var refundable = Math.Round(original * (rule?.RefundPercentage ?? 0) / 100m, 2, MidpointRounding.AwayFromZero);

        var airlineFee = rule is null
            ? 0m
            : Math.Round(refundable * rule.AirlineFeePercent / 100m, 2, MidpointRounding.AwayFromZero)
              + rule.AirlineFeeAmount;

        var agency = rule?.AgencyServiceFee ?? 0m;
        var payment = rule?.PaymentProcessingFee ?? 0m;
        var other = rule?.OtherFee ?? 0m;
        var totalFees = airlineFee + agency + payment + other;

        // Never negative: a customer cannot owe money back on a cancellation.
        var refund = Math.Max(0m, Math.Round(refundable - totalFees, 2, MidpointRounding.AwayFromZero));

        // A non-refundable fare or a "no refund" resolution can never pay cash,
        // whatever the percentage says.
        if (match.IsNonRefundable || match.Resolution == RefundResolutions.None) refund = 0m;

        return new RefundQuote(
            match.Tier,
            PolicyTiers.Label(match.Tier),
            rule?.Id,
            match.PolicyName,
            match.RequiresApproval,
            rule?.RefundPercentage ?? 0,
            original,
            refundable,
            airlineFee,
            agency,
            payment,
            other,
            totalFees,
            refund,
            match.Resolution,
            match.IsNonRefundable,
            refund > 0 && match.Resolution == RefundResolutions.Cash,
            match.HoursSinceBooking,
            match.HoursBeforeDeparture,
            match.DepartureAt,
            match.FallbackReason,
            now,
            now.Add(QuoteValidity));
    }

    /// <summary>An open (not yet rejected/voided) cancellation blocks a second request.</summary>
    public Task<BookingCancellation?> LiveCancellationAsync(int bookingId, CancellationToken ct = default) =>
        db.BookingCancellations
            .Where(c => c.BookingId == bookingId && LiveStatuses.Contains(c.Status))
            .OrderByDescending(c => c.Id)
            .FirstOrDefaultAsync(ct);

    public static bool IsTerminalBookingStatus(string? status) =>
        string.Equals(status, BookingStatusValues.Cancelled, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(status, BookingStatusValues.Refunded, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Records the request. When the policy allows it, the cancellation is
    /// approved on the spot (the grace period), a pending refund is raised and
    /// the seat inventory is released; otherwise the booking simply goes into
    /// the staff review queue and nothing else changes.
    /// </summary>
    public async Task<(BookingCancellation Cancellation, BookingRefund? Refund, string Message)> RequestAsync(
        Booking booking,
        string reasonCode,
        string reason,
        string requestedBy,
        DateTime? at = null,
        CancellationToken ct = default)
    {
        var now = at ?? DateTime.UtcNow;
        var match = await policy.ResolveAsync(booking, now, ct);
        var quote = Build(booking, match, now);

        var autoApprove = !match.RequiresApproval;
        var status = autoApprove
            ? CancellationStatuses.Approved
            : CancellationStatuses.Requested;

        var cancellation = new BookingCancellation
        {
            Reference = await NextReferenceAsync("CANC", now, ct),
            BookingId = booking.Id,
            CustomerName = booking.CustomerName,
            CustomerEmail = booking.CustomerEmail,
            Status = status,
            ReasonCode = reasonCode?.Trim() ?? string.Empty,
            Reason = reason?.Trim() ?? string.Empty,
            RequestedAt = now,
            CancellationDate = autoApprove ? now : null,
            DecidedAt = autoApprove ? now : null,
            RequestedBy = requestedBy,
            ApprovedBy = autoApprove ? "system:auto-approve" : string.Empty,
            ApprovedAt = autoApprove ? now : null,

            PolicyRuleId = match.Rule?.Id ?? 0,
            PolicyName = match.PolicyName,
            PolicyTier = match.Tier,
            FareType = match.FareType,
            RefundPercentage = quote.RefundPercentage,
            RequiresApproval = match.RequiresApproval,
            AutoApproved = autoApprove,
            Resolution = match.Resolution,

            DepartureDate = match.DepartureAt,
            HoursSinceBooking = match.HoursSinceBooking,
            HoursBeforeDeparture = match.HoursBeforeDeparture,
            PastDeparture = match.PastDeparture,

            OriginalAmount = quote.OriginalAmount,
            AirlineCancellationFee = quote.AirlineCancellationFee,
            AgencyServiceFee = quote.AgencyServiceFee,
            PaymentProcessingFee = quote.PaymentProcessingFee,
            OtherFee = quote.OtherFee,
            TotalFees = quote.TotalFees,
            RefundableAmount = quote.RefundableAmount,
            RefundAmount = quote.RefundAmount,
        };

        db.BookingCancellations.Add(cancellation);
        await db.SaveChangesAsync(ct);

        booking.ActiveCancellationId = cancellation.Id;
        booking.CancellationStatus = status;
        booking.UpdatedAt = now;

        BookingRefund? refund = null;
        if (autoApprove)
        {
            // Seat inventory goes back on sale the moment the cancellation stands.
            foreach (var flight in booking.BookingFlights.Where(f => f.SeatStatus != "Available"))
            {
                flight.SeatStatus = "Available";
                flight.SeatNumber = string.Empty;
            }

            booking.Status = BookingStatusValues.Cancelled;
            booking.CancelledAt = now;

            refund = new BookingRefund
            {
                Reference = await NextReferenceAsync("RFND", now, ct),
                CancellationId = cancellation.Id,
                BookingId = booking.Id,
                Status = RefundStatuses.Pending,
                Method = match.Resolution == RefundResolutions.TravelCredit ? "travel-credit" : booking.PaymentMethod,
                Amount = quote.RefundAmount,
                CalculatedAmount = quote.RefundAmount,
                OriginalAmount = quote.OriginalAmount,
                TotalDeductions = quote.TotalFees,
                RequestedBy = requestedBy,
            };
            db.BookingRefunds.Add(refund);
            await db.SaveChangesAsync(ct);

            // Legacy mirror columns so the existing admin booking table keeps
            // showing the refund without knowing about the cancellation tables.
            booking.RefundAmount = quote.RefundAmount;
            booking.RefundReference = refund.Reference;
            booking.CancellationPolicyTier = match.Tier;
            booking.Paid = false;
        }
        else
        {
            booking.Status = BookingStatusValues.CancellationRequested;
        }

        await db.SaveChangesAsync(ct);

        var message = autoApprove
            ? quote.IsRefundable
                ? $"Cancellation approved. A refund of {quote.RefundAmount:0.00} is queued for processing."
                : "Cancellation recorded. This booking is not refundable under the current policy."
            : "Cancellation request submitted and awaiting staff review.";

        return (cancellation, refund, message);
    }

    /// <summary>Sequential, collision-checked document reference (CANC-2026-000123).</summary>
    private async Task<string> NextReferenceAsync(string prefix, DateTime now, CancellationToken ct)
    {
        for (var attempt = 0; attempt < 8; attempt++)
        {
            var candidate = $"{prefix}-{now:yyyy}-{Random.Shared.Next(100000, 999999)}";
            var taken = prefix == "CANC"
                ? await db.BookingCancellations.AnyAsync(c => c.Reference == candidate, ct)
                : await db.BookingRefunds.AnyAsync(r => r.Reference == candidate, ct);
            if (!taken) return candidate;
        }

        // Fall back to a value that cannot collide within the same year.
        return $"{prefix}-{now:yyyy}-{DateTime.UtcNow.Ticks % 1000000:D6}";
    }
}
