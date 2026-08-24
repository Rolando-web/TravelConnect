namespace TravelConnect.Server.Models;

public class CustomerInquiry
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string BookingReference { get; set; } = string.Empty;
    public DateTime DateSubmitted { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "open"; // open, in_progress, resolved
}
