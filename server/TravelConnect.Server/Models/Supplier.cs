namespace TravelConnect.Server.Models;

public class Supplier : BaseEntity
{
    public string CompanyName { get; set; } = string.Empty;
    public string ContactName { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public decimal Rating { get; set; }
    public string Status { get; set; } = "Active";
    public string FirebaseUid { get; set; } = string.Empty;
}