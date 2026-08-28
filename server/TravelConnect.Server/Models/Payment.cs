namespace TravelConnect.Server.Models;

public class Payment : BaseEntity
{
    public string ReferenceId { get; set; } = string.Empty;
    public int? BookingId { get; set; }
    public Booking? Booking { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Method { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public string PaymentDate { get; set; } = string.Empty;
}