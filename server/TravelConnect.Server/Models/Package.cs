namespace TravelConnect.Server.Models;

public class Package
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public double Rating { get; set; }
    public int DurationDays { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string Tag { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    // Services included in the travel package
    public string FlightInfo { get; set; } = string.Empty;
    public string HotelInfo { get; set; } = string.Empty;
    public string CarRentalInfo { get; set; } = string.Empty;
    public string IncludedActivities { get; set; } = string.Empty;
}
