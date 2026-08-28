namespace TravelConnect.Server.Models;

public class Inquiry : BaseEntity
{
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public string Reply { get; set; } = string.Empty;
}