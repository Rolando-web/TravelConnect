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
    public string CancellationPolicyTier { get; set; } = string.Empty; // "full", "partial", "credit"
    public decimal RefundAmount { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string RefundReference { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // "flight", "hotel", "car", "package"
    public List<BookingFlight> BookingFlights { get; set; } = new();
}
