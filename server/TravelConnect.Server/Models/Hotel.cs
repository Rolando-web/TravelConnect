namespace TravelConnect.Server.Models;

public class Hotel : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal PricePerNight { get; set; }
    public decimal Rating { get; set; }
    public int Reviews { get; set; }
    public string Amenities { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public int RoomsAvailable { get; set; }
    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
}