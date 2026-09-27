namespace TravelConnect.Server.Models;

public class Booking
{
    public int Id { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public int PackageId { get; set; }
    public string PackageName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public int Travellers { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string PromoCodeUsed { get; set; } = string.Empty;
    public string Status { get; set; } = "upcoming"; // upcoming, completed, cancelled
    public bool Paid { get; set; } = true;
    public string PaymentMethod { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string SpecialRequests { get; set; } = string.Empty;
    public string SeatNumbers { get; set; } = string.Empty; // Comma-separated: "12A,12B" or per-segment
    public string CancellationPolicyTier { get; set; } = string.Empty; // legacy tier label ("full"/"partial"/"credit")
    public decimal RefundAmount { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string RefundReference { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // "flight", "hotel", "car", "package"

    // ── Cancellation / refund workflow (see BookingCancellation) ──
    // Fare family the airline ticket was sold under; the cancellation policy is
    // matched on this (a "Non-Refundable" promo fare never gets cash back).
    public string FareType { get; set; } = FareTypes.Economy;
    // Denormalised mirrors of the active cancellation/refund status so booking
    // lists can filter without joining the workflow tables.
    public string CancellationStatus { get; set; } = CancellationStatuses.Confirmed;
    public string RefundStatus { get; set; } = string.Empty;
    public int? ActiveCancellationId { get; set; }

    public List<BookingFlight> BookingFlights { get; set; } = new();
    public List<BookingCancellation> Cancellations { get; set; } = new();
}
