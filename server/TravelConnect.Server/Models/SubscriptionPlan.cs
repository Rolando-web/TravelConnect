namespace TravelConnect.Server.Models;

public class SubscriptionPlan : BaseEntity
{
    public int TierLevel { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal MonthlyPrice { get; set; }
    public int MaxUsers { get; set; }
    public string Features { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
}
