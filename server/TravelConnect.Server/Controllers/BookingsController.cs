using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController(TravelConnectDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Booking>>> GetAll(string? status = null, string? customer = null)
    {
        IQueryable<Booking> query = db.Bookings.AsNoTracking().OrderByDescending(b => b.CreatedAt);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(b => b.Status == status);
        if (!string.IsNullOrWhiteSpace(customer))
        {
            var c = customer.ToLower();
            query = query.Where(b =>
                b.CustomerName.ToLower().Contains(c) ||
                b.CustomerEmail.ToLower().Contains(c));
        }
        return await query
            .Include(b => b.BookingFlights.OrderBy(f => f.SegmentOrder))
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Booking>> GetById(int id)
    {
        var booking = await db.Bookings
            .Include(b => b.BookingFlights.OrderBy(f => f.SegmentOrder))
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id);
        if (booking is null) return NotFound(new { message = "Booking not found" });
        return Ok(booking);
    }

    [HttpGet("reference/{reference}")]
    public async Task<ActionResult<Booking>> GetByReference(string reference)
    {
        var booking = await db.Bookings
            .Include(b => b.BookingFlights.OrderBy(f => f.SegmentOrder))
            .Where(b => b.ReferenceNumber == reference)
            .FirstOrDefaultAsync();
        if (booking is null) return NotFound(new { message = "Booking not found" });
        return Ok(booking);
    }

    [HttpGet("customer/{email}")]
    public async Task<ActionResult<IEnumerable<Booking>>> GetByCustomer(string email)
    {
        return await db.Bookings
            .Where(b => b.CustomerEmail.ToLower() == email.ToLower())
            .Include(b => b.BookingFlights.OrderBy(f => f.SegmentOrder))
            .AsNoTracking()
            .ToListAsync();
    }

    public record FlightSegmentDto(
        int SegmentOrder,
        string Airline,
        string FlightNumber,
        string DepartureCity,
        string ArrivalCity,
        string DepartureTime,
        string ArrivalTime,
        string DepartureDate,
        string Class,
        decimal Price);

    public record CreateBookingRequest(
        Booking Booking,
        List<FlightSegmentDto>? FlightSegments);

    [HttpPost]
    public async Task<ActionResult<Booking>> Create(CreateBookingRequest req)
    {
        var booking = req.Booking;
        booking.CreatedAt = DateTime.UtcNow;
        booking.UpdatedAt = DateTime.UtcNow;
        booking.BookingFlights = req.FlightSegments?
            .OrderBy(f => f.SegmentOrder)
            .Take(6)
            .Select(f => new BookingFlight
            {
                SegmentOrder = f.SegmentOrder,
                Airline = f.Airline,
                FlightNumber = f.FlightNumber,
                DepartureCity = f.DepartureCity,
                ArrivalCity = f.ArrivalCity,
                DepartureTime = f.DepartureTime,
                ArrivalTime = f.ArrivalTime,
                DepartureDate = f.DepartureDate,
                Class = f.Class,
                Price = f.Price
            })
            .ToList() ?? new List<BookingFlight>();

        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        // Link any matching pending PayMongo payment to this booking so the
        // Payment and Booking records are connected (Payment.BookingId != null).
        var reference = booking.ReferenceNumber;
        if (string.IsNullOrWhiteSpace(reference))
            reference = booking.PackageName;
        if (!string.IsNullOrWhiteSpace(reference) &&
            !string.IsNullOrWhiteSpace(booking.CustomerName))
        {
            var pending = await db.Payments
                .Where(p => p.BookingId == null &&
                            p.CustomerName.ToLower() == booking.CustomerName.ToLower() &&
                            (p.PackageName == reference))
                .OrderByDescending(p => p.Id)
                .FirstOrDefaultAsync();

            if (pending is not null)
            {
                pending.BookingId = booking.Id;
                pending.UpdatedAt = DateTime.UtcNow;
                if (!string.IsNullOrWhiteSpace(booking.TransactionId))
                    pending.ReferenceId = booking.TransactionId;
                booking.Paid = true;
                await db.SaveChangesAsync();
            }
        }

        return CreatedAtAction(nameof(GetById), new { id = booking.Id }, booking);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Booking booking)
    {
        if (id != booking.Id) return BadRequest(new { message = "ID mismatch" });
        var existing = await db.Bookings.FirstOrDefaultAsync(b => b.Id == id);
        if (existing is null) return NotFound(new { message = "Booking not found" });

        db.Entry(existing).CurrentValues.SetValues(booking);
        existing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == id);
        if (booking is null) return NotFound(new { message = "Booking not found" });
        db.Bookings.Remove(booking);
        await db.SaveChangesAsync();
        return NoContent();
    }
}