namespace TravelConnect.Server.Models;

public class Package : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal Rating { get; set; }
    public int Reviews { get; set; }
    public string Tag { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public string Itinerary { get; set; } = string.Empty;
    public string Inclusions { get; set; } = string.Empty;
    public string Exclusions { get; set; } = string.Empty;
    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
}