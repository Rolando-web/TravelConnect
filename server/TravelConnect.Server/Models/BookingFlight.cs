namespace TravelConnect.Server.Models;

public class BookingFlight
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    public Booking? Booking { get; set; }

    // Segment position within the itinerary (1-based, up to 6).
    public int SegmentOrder { get; set; }

    // Snapshot of the selected flight at booking time so the segment remains
    // intact even if the flight catalog changes later.
    public string Airline { get; set; } = string.Empty;
    public string FlightNumber { get; set; } = string.Empty;
    public string DepartureCity { get; set; } = string.Empty;
    public string ArrivalCity { get; set; } = string.Empty;
    public string DepartureTime { get; set; } = string.Empty;
    public string ArrivalTime { get; set; } = string.Empty;
    public string DepartureDate { get; set; } = string.Empty;
    public string Class { get; set; } = "Economy";
    public decimal Price { get; set; }
}
