using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Controllers;

[Route("api/[controller]")]
[ApiController]
public class SeatMapsController : ControllerBase
{
    private readonly TravelConnectDbContext _db;

    public SeatMapsController(TravelConnectDbContext db) => _db = db;

    // GET api/seatmaps/flight/{flightId}
    [HttpGet("flight/{flightId:int}")]
    public async Task<IActionResult> GetSeatMap(int flightId)
    {
        var flight = await _db.Flights.FindAsync(flightId);
        if (flight == null) return NotFound(new { message = "Flight not found" });

        var totalRows = flight.TotalRows > 0 ? flight.TotalRows : 30;
        var columns = string.IsNullOrEmpty(flight.SeatConfig)
            ? new[] { "A", "B", "C", "D", "E", "F" }
            : flight.SeatConfig.Split(',', StringSplitOptions.RemoveEmptyEntries);

        // Get all booked/reserved seats for this flight
        var bookedSeats = await _db.BookingFlights
            .Where(bf => bf.FlightNumber == flight.FlightNumber
                      && bf.DepartureDate == flight.DepartureDate
                      && bf.SeatStatus != "Available"
                      && !string.IsNullOrEmpty(bf.SeatNumber))
            .Select(bf => new { bf.SeatNumber, bf.SeatStatus })
            .ToListAsync();

        var occupiedMap = bookedSeats.ToDictionary(b => b.SeatNumber, b => b.SeatStatus);

        var seats = new List<object>();
        for (int row = 1; row <= totalRows; row++)
        {
            foreach (var col in columns)
            {
                var seatId = $"{row}{col}";
                var status = occupiedMap.TryGetValue(seatId, out var s) ? s : "Available";
                var seatType = col is "A" or "F" ? "Window" : col is "C" or "D" ? "Aisle" : "Middle";

                seats.Add(new
                {
                    seatId,
                    row,
                    column = col,
                    seatType,
                    status
                });
            }
        }

        return Ok(new
        {
            flightId,
            flight.FlightNumber,
            flight.Airline,
            totalRows,
            columns,
            totalSeats = totalRows * columns.Length,
            seats
        });
    }

    // PUT api/seatmaps/reserve
    [HttpPut("reserve")]
    public async Task<IActionResult> ReserveSeat([FromBody] ReserveSeatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FlightNumber) || string.IsNullOrWhiteSpace(request.SeatNumber))
            return BadRequest(new { message = "FlightNumber and SeatNumber are required" });

        // Check if seat is already occupied
        var existing = await _db.BookingFlights
            .Where(bf => bf.FlightNumber == request.FlightNumber
                      && bf.DepartureDate == request.DepartureDate
                      && bf.SeatNumber == request.SeatNumber
                      && bf.SeatStatus != "Available")
            .FirstOrDefaultAsync();

        if (existing != null)
            return Conflict(new { message = $"Seat {request.SeatNumber} is already {existing.SeatStatus}" });

        return Ok(new { success = true, seatNumber = request.SeatNumber, status = "Reserved" });
    }

    // PUT api/seatmaps/release
    [HttpPut("release")]
    public async Task<IActionResult> ReleaseSeat([FromBody] ReleaseSeatRequest request)
    {
        var flight = await _db.Flights
            .Where(f => f.FlightNumber == request.FlightNumber && f.DepartureDate == request.DepartureDate)
            .FirstOrDefaultAsync();

        if (flight == null) return NotFound(new { message = "Flight not found" });

        var affected = await _db.BookingFlights
            .Where(bf => bf.FlightNumber == request.FlightNumber
                      && bf.DepartureDate == request.DepartureDate
                      && bf.SeatNumber == request.SeatNumber
                      && bf.SeatStatus != "Available")
            .ExecuteUpdateAsync(setters => setters.SetProperty(bf => bf.SeatStatus, "Available"));

        return Ok(new { success = true, released = affected > 0 });
    }

    // PUT api/seatmaps/release-by-booking/{bookingId}
    [HttpPut("release-by-booking/{bookingId:int}")]
    public async Task<IActionResult> ReleaseSeatsForBooking(int bookingId)
    {
        var flights = await _db.BookingFlights
            .Where(bf => bf.BookingId == bookingId && bf.SeatStatus != "Available")
            .ToListAsync();

        foreach (var f in flights)
        {
            f.SeatStatus = "Available";
            f.SeatNumber = string.Empty;
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true, releasedSeats = flights.Count });
    }

    // PUT api/seatmaps/confirm
    [HttpPut("confirm")]
    public async Task<IActionResult> ConfirmSeat([FromBody] ConfirmSeatRequest request)
    {
        var flight = await _db.BookingFlights
            .Where(bf => bf.BookingId == request.BookingId
                      && bf.SegmentOrder == request.SegmentOrder)
            .FirstOrDefaultAsync();

        if (flight == null) return NotFound(new { message = "Booking flight segment not found" });

        flight.SeatNumber = request.SeatNumber;
        flight.SeatStatus = "Sold";
        await _db.SaveChangesAsync();

        return Ok(new { success = true, seatNumber = request.SeatNumber, status = "Sold" });
    }

    // PUT api/seatmaps/admin-override
    [HttpPut("admin-override")]
    public async Task<IActionResult> AdminOverrideSeat([FromBody] AdminOverrideSeatRequest request)
    {
        var flight = await _db.BookingFlights
            .Where(bf => bf.BookingId == request.BookingId
                      && bf.SegmentOrder == request.SegmentOrder)
            .FirstOrDefaultAsync();

        if (flight == null) return NotFound(new { message = "Booking flight segment not found" });

        // Release old seat if any
        if (!string.IsNullOrEmpty(flight.SeatNumber) && flight.SeatStatus != "Available")
        {
            flight.SeatStatus = "Available";
        }

        // Assign new seat
        flight.SeatNumber = request.NewSeatNumber;
        flight.SeatStatus = "Sold";
        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            previousSeat = flight.SeatNumber,
            newSeatNumber = request.NewSeatNumber,
            message = $"Seat overridden to {request.NewSeatNumber}"
        });
    }
}

public record ReserveSeatRequest(
    string FlightNumber,
    string DepartureDate,
    string SeatNumber
);

public record ReleaseSeatRequest(
    string FlightNumber,
    string DepartureDate,
    string SeatNumber
);

public record ConfirmSeatRequest(
    int BookingId,
    int SegmentOrder,
    string SeatNumber
);

public record AdminOverrideSeatRequest(
    int BookingId,
    int SegmentOrder,
    string NewSeatNumber
);
