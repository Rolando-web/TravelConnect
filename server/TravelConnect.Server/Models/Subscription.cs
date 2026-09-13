namespace TravelConnect.Server.Models;

public class Subscription : BaseEntity
{
    public string AgencyName { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;
    public int TierLevel { get; set; }
    public string PlanStatus { get; set; } = "Active";
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime EndDate { get; set; } = DateTime.UtcNow.AddYears(1);
    public decimal MonthlyPrice { get; set; }
    public int MaxUsers { get; set; }
    public string LicenseKey { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}
