namespace TravelConnect.Server.Models;

public class Flight : BaseEntity
{
    public string Airline { get; set; } = string.Empty;
    public string FlightNumber { get; set; } = string.Empty;
    public string DepartureCity { get; set; } = string.Empty;
    public string ArrivalCity { get; set; } = string.Empty;
    public string DepartureTime { get; set; } = string.Empty;
    public string ArrivalTime { get; set; } = string.Empty;
    public string DepartureDate { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Class { get; set; } = "Economy";
    public int SeatsAvailable { get; set; }
    public int TotalSeats { get; set; } = 180; // Total seats for seat map generation
    public int TotalRows { get; set; } = 30;   // Rows in the cabin
    public string SeatConfig { get; set; } = "A,B,C,D,E,F"; // Column layout
    public string ImageUrl { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
}