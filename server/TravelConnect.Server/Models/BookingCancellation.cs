namespace TravelConnect.Server.Models;

/// <summary>
/// One cancellation request against a booking. This is the workflow record
/// (requested → approved/rejected → cancelled → refund …) and it also freezes a
/// full snapshot of the refund calculation that was shown to the customer at
/// request time, so a later policy change can never rewrite history.
/// </summary>
public class BookingCancellation : BaseEntity
{
    public string Reference { get; set; } = string.Empty; // CANC-2026-000123
    public int BookingId { get; set; }
    public Booking? Booking { get; set; }

    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;

    public string Status { get; set; } = CancellationStatuses.Requested;
    public string ReasonCode { get; set; } = string.Empty; // "change-of-plans", "emergency", …
    public string Reason { get; set; } = string.Empty;      // free-text detail from the customer

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CancellationDate { get; set; } // when the cancellation took effect
    public DateTime? DecidedAt { get; set; }

    public string RequestedBy { get; set; } = string.Empty;
    public string ApprovedBy { get; set; } = string.Empty;
    public DateTime? ApprovedAt { get; set; }
    public string RejectionReason { get; set; } = string.Empty;

    // ── policy snapshot (which configured rule produced these numbers) ──
    public int PolicyRuleId { get; set; }
    public string PolicyName { get; set; } = string.Empty;
    public string PolicyTier { get; set; } = string.Empty;      // grace | early | late | non-refundable | no-show
    public string FareType { get; set; } = string.Empty;
    public int RefundPercentage { get; set; }
    public bool RequiresApproval { get; set; }
    public bool AutoApproved { get; set; }
    public bool IsException { get; set; }                       // staff override (non-refundable / no-show)
    public string Resolution { get; set; } = RefundResolutions.Cash;

    // ── departure / timing snapshot ──
    public DateTime? DepartureDate { get; set; }
    public int HoursSinceBooking { get; set; }
    public int HoursBeforeDeparture { get; set; }
    public bool PastDeparture { get; set; }

    // ── money snapshot ──
    public decimal OriginalAmount { get; set; }
    public decimal AirlineCancellationFee { get; set; }
    public decimal AgencyServiceFee { get; set; }
    public decimal PaymentProcessingFee { get; set; }
    public decimal OtherFee { get; set; }
    public decimal TotalFees { get; set; }
    public decimal RefundableAmount { get; set; } // eligible after the airline penalty
    public decimal RefundAmount { get; set; }     // final customer refund
    public string Notes { get; set; } = string.Empty;

    public List<BookingRefund> Refunds { get; set; } = new();
}
