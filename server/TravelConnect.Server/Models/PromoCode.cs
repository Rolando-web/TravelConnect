namespace TravelConnect.Server.Models;

public class PromoCode
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DiscountType { get; set; } = "percentage"; // percentage or fixed
    public decimal DiscountValue { get; set; }
    public decimal MinimumSpend { get; set; }
    public string ExpirationDate { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
