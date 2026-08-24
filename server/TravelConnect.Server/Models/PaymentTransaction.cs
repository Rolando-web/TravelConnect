namespace TravelConnect.Server.Models;

public class PaymentTransaction
{
    public int Id { get; set; }
    public string TransactionId { get; set; } = string.Empty;
    public string BookingReference { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string PaymentMethod { get; set; } = string.Empty; // Credit Card, PayPal, Installments, Wire Transfer
    public string CardLastFour { get; set; } = string.Empty;
    public string Status { get; set; } = "completed"; // completed, failed, refunded
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
}
