using Microsoft.AspNetCore.Mvc;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private static readonly List<Booking> _mockBookings = new()
    {
        new Booking
        {
            Id = 1,
            ReferenceNumber = "TC-2026-0814",
            CustomerName = "Jane Doe",
            CustomerEmail = "jane@example.com",
            PackageId = 101,
            PackageName = "Bali Serenity Escape",
            Location = "Bali, Indonesia",
            ImageUrl = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
            StartDate = "2026-09-15",
            EndDate = "2026-09-22",
            Travellers = 2,
            Subtotal = 2598,
            DiscountAmount = 0,
            TotalAmount = 2598,
            Status = "upcoming",
            Paid = true,
            PaymentMethod = "Credit Card",
            TransactionId = "TXN-BALI-98421"
        },
        new Booking
        {
            Id = 2,
            ReferenceNumber = "TC-2026-0601",
            CustomerName = "Jane Doe",
            CustomerEmail = "jane@example.com",
            PackageId = 102,
            PackageName = "Tokyo Neon & Culture",
            Location = "Tokyo, Japan",
            ImageUrl = "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
            StartDate = "2026-06-10",
            EndDate = "2026-06-15",
            Travellers = 2,
            Subtotal = 3740,
            DiscountAmount = 0,
            TotalAmount = 3740,
            Status = "completed",
            Paid = true,
            PaymentMethod = "PayPal",
            TransactionId = "TXN-TOKYO-44120"
        }
    };

    [HttpGet]
    public IActionResult GetBookings([FromQuery] string? email)
    {
        if (string.IsNullOrEmpty(email))
        {
            return Ok(_mockBookings);
        }

        var results = _mockBookings
            .Where(b => b.CustomerEmail.Equals(email, StringComparison.OrdinalIgnoreCase))
            .ToList();

        return Ok(results);
    }

    [HttpPost]
    public IActionResult CreateBooking([FromBody] Booking booking)
    {
        if (booking == null)
        {
            return BadRequest(new { message = "Invalid booking details." });
        }

        booking.Id = _mockBookings.Count + 1;
        if (string.IsNullOrEmpty(booking.ReferenceNumber))
        {
            booking.ReferenceNumber = $"TC-{DateTime.UtcNow:yyyy}-{Random.Shared.Next(1000, 9999)}";
        }
        if (string.IsNullOrEmpty(booking.TransactionId))
        {
            booking.TransactionId = $"TXN-{Random.Shared.Next(100000, 999999)}";
        }
        booking.CreatedAt = DateTime.UtcNow;

        _mockBookings.Insert(0, booking);

        return Ok(new
        {
            message = "Booking transaction created successfully",
            booking
        });
    }

    [HttpPost("{id}/cancel")]
    public IActionResult CancelBooking(int id)
    {
        var booking = _mockBookings.FirstOrDefault(b => b.Id == id);
        if (booking == null)
        {
            return NotFound(new { message = "Booking not found." });
        }

        booking.Status = "cancelled";
        booking.Paid = false;

        return Ok(new
        {
            message = "Booking cancelled successfully",
            booking
        });
    }
}
