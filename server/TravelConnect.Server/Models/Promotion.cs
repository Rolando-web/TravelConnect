namespace TravelConnect.Server.Models;

public class Promotion : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Discount { get; set; }
    public string DiscountType { get; set; } = "Percent";
    public int MaxUses { get; set; }
    public int UsedCount { get; set; }
    public string ExpiresAt { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
}