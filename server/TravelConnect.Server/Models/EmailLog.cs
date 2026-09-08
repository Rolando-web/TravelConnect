namespace TravelConnect.Server.Models;

public class EmailLog
{
    public int Id { get; set; }
    public int? BookingId { get; set; }
    public Booking? Booking { get; set; }
    public string RecipientEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // "booking_confirmation", "cancellation", "refund"
    public string Status { get; set; } = "Sent"; // Sent, Failed, Pending
    public string ErrorMessage { get; set; } = string.Empty;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
