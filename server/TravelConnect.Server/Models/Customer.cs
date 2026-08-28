namespace TravelConnect.Server.Models;

public class Customer : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public int TotalBookings { get; set; }
    public decimal TotalSpent { get; set; }
    public string Status { get; set; } = "Active";
}