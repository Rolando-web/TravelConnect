namespace TravelConnect.Server.Models;

public class Activity : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Duration { get; set; } = string.Empty;
    public decimal Rating { get; set; }
    public int Reviews { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
}