namespace TravelConnect.Server.Models;

/// <summary>
/// The money movement that settles a cancellation. A booking can have at most
/// one live refund row (enforced by a filtered unique index on BookingId), so a
/// second refund can never be created for a booking that was already refunded.
/// Staff may adjust <see cref="Amount"/> from the calculated figure, but every
/// adjustment is written to the audit trail.
/// </summary>
public class BookingRefund : BaseEntity
{
    public string Reference { get; set; } = string.Empty; // RFND-2026-000123
    public int CancellationId { get; set; }
    public BookingCancellation? Cancellation { get; set; }
    public int BookingId { get; set; }
    public Booking? Booking { get; set; }

    public string Status { get; set; } = RefundStatuses.Pending;
    public string Method { get; set; } = string.Empty;      // gcash | paymaya | card | wallet | travel-credit
    public decimal Amount { get; set; }                     // what the customer actually receives
    public decimal CalculatedAmount { get; set; }           // engine result before any staff adjustment
    public decimal OriginalAmount { get; set; }
    public decimal TotalDeductions { get; set; }
    public bool IsAdjusted { get; set; }

    public string RefundReference { get; set; } = string.Empty; // provider / remittance reference
    public string RequestedBy { get; set; } = string.Empty;
    public string ApprovedBy { get; set; } = string.Empty;
    public DateTime? ApprovedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string RejectionReason { get; set; } = string.Empty;
    public string FailureReason { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;

    /// <summary>Payment row this refund settles (finance/reconciliation link).</summary>
    public int? PaymentId { get; set; }
    public Payment? Payment { get; set; }
}
