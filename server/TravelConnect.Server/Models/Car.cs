namespace TravelConnect.Server.Models;

public class Car : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public decimal PricePerDay { get; set; }
    public string Transmission { get; set; } = "Automatic";
    public int Seats { get; set; }
    public string FuelType { get; set; } = "Gasoline";
    public string ImageUrl { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
}