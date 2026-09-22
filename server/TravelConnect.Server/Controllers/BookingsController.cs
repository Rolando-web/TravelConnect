using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class BookingsController(
    TravelConnectDbContext db,
    IServiceScopeFactory scopeFactory,
    PdfService pdfService,
    CancellationService cancellationService,
    PromoService promoService,
    ILogger<BookingsController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Booking>>> GetAll(string? status = null, string? customer = null, int? page = null, int? pageSize = null)
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
        // Page-size cap keeps the admin list from loading the whole table.
        var ps = Math.Clamp(pageSize ?? 200, 1, 500);
        if (page is > 0)
            query = query.Skip((page.Value - 1) * ps);
        return await query
            .Include(b => b.BookingFlights.OrderBy(f => f.SegmentOrder))
            .Take(ps)
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
    [AllowAnonymous]
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
    [AllowAnonymous]
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
        decimal Price,
        string? SeatNumber = null);

    public record CreateBookingRequest(
        Booking Booking,
        List<FlightSegmentDto>? FlightSegments);

    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting("anonymous-write")]
    public async Task<ActionResult<Booking>> Create(CreateBookingRequest req)
    {
        var booking = req.Booking;
        booking.CreatedAt = DateTime.UtcNow;
        booking.UpdatedAt = DateTime.UtcNow;

        // Promo codes are applied authoritatively here, never by trusting the
        // client's DiscountAmount/TotalAmount. The client may compute a preview
        // for UX, but the server re-validates the code, re-computes the
        // discount, and bumps the campaign usage count.
        var promoCode = (booking.PromoCodeUsed ?? string.Empty).Trim();
        Promotion? appliedPromo = null;
        if (promoCode.Length > 0)
        {
            var promo = await promoService.ValidateAsync(promoCode, booking.Subtotal);
            if (!promo.IsValid)
                return BadRequest(new { message = promo.Error ?? "Invalid promo code" });
            appliedPromo = promo.Promo;
            booking.PromoCodeUsed = appliedPromo!.Code;
            booking.DiscountAmount = promo.DiscountAmount;
            booking.TotalAmount = promo.FinalAmount;
        }
        else
        {
            // A discount sent without a code is rejected (tamper guard).
            booking.PromoCodeUsed = string.Empty;
            booking.DiscountAmount = 0m;
        }

        var segments = req.FlightSegments?
            .OrderBy(f => f.SegmentOrder)
            .Take(6)
            .ToList();

        if (segments is not null && segments.Count > 0)
            await AutoAssignSeatsAsync(booking, segments);

        booking.BookingFlights = segments?
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
                Price = f.Price,
                SeatNumber = f.SeatNumber ?? string.Empty,
                SeatStatus = !string.IsNullOrWhiteSpace(f.SeatNumber) ? "Sold" : "Available"
            })
            .ToList() ?? new List<BookingFlight>();

        booking.SeatNumbers = string.Join(",", booking.BookingFlights
            .Where(f => !string.IsNullOrWhiteSpace(f.SeatNumber))
            .Select(f => f.SeatNumber));

        // Consume one redemption of the applied campaign (the entity is already
        // tracked by ValidateAsync, so this persists with SaveChangesAsync).
        if (appliedPromo is not null)
            appliedPromo.UsedCount += 1;

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

        // Pipeline: a paid booking promotes the traveler to a Customer record
        // and closes their CRM lead as "Closed Won". De-duplicated by email.
        if (booking.Paid && !string.IsNullOrWhiteSpace(booking.CustomerEmail))
        {
            var email = booking.CustomerEmail.Trim().ToLowerInvariant();

            var customer = await db.Customers
                .FirstOrDefaultAsync(c => c.Email.ToLower() == email);
            if (customer is null)
            {
                customer = new Customer
                {
                    Name = booking.CustomerName,
                    Email = booking.CustomerEmail.Trim(),
                    Phone = booking.CustomerPhone,
                    Country = string.Empty,
                    TotalBookings = 1,
                    TotalSpent = booking.TotalAmount,
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.Customers.Add(customer);
            }
            else
            {
                customer.TotalBookings += 1;
                customer.TotalSpent += booking.TotalAmount;
                customer.UpdatedAt = DateTime.UtcNow;
            }

            var lead = await db.Leads
                .FirstOrDefaultAsync(l => l.Email.ToLower() == email);
            if (lead is not null)
            {
                lead.Stage = "Won";
                lead.LastContact = DateTime.UtcNow.ToString("yyyy-MM-dd");
                lead.NextFollowUp = string.Empty;
                lead.UpdatedAt = DateTime.UtcNow;
            }
        }

        // Send the booking confirmation email in the background (the customer's
        // checkout screen promises a voucher & invoice by email, so don't let an
        // SMTP hiccup block the booking response). The DI scope is created inside
        // the task so it is never disposed before the email sends.
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();
                await emailService.SendBookingConfirmationAsync(booking, booking.BookingFlights.ToList());
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send confirmation email for booking {BookingId}", booking.Id);
            }
        });

        return CreatedAtAction(nameof(GetById), new { id = booking.Id }, booking);
    }

    // Assign one seat per traveller for every segment that has no seat chosen
    // yet, so a confirmation email always shows concrete seats (real agency
    // workflow). Seats are drawn from the flight's cabin layout, skipping any
    // already taken on that flight + date. Stored comma-separated on the
    // segment, e.g. "12A,12B" for a 2-traveller booking.
    private async Task AutoAssignSeatsAsync(Booking booking, List<FlightSegmentDto> segments)
    {
        if (booking.Travellers < 1) return;

        var flights = await db.Flights.ToListAsync();
        var flightsByKey = flights
            .GroupBy(f => f.FlightNumber + "|" + f.DepartureDate)
            .ToDictionary(g => g.Key, g => g.First());

        for (var i = 0; i < segments.Count; i++)
        {
            var seg = segments[i];
            if (!string.IsNullOrWhiteSpace(seg.SeatNumber)) continue;

            flightsByKey.TryGetValue(seg.FlightNumber + "|" + seg.DepartureDate, out var flight);
            var totalRows = flight is null || flight.TotalRows <= 0 ? 30 : flight.TotalRows;
            var columns = flight is not null && !string.IsNullOrWhiteSpace(flight.SeatConfig)
                ? flight.SeatConfig.Split(',', StringSplitOptions.RemoveEmptyEntries)
                : new[] { "A", "B", "C", "D", "E", "F" };

            var taken = await db.BookingFlights
                .Where(bf => bf.FlightNumber == seg.FlightNumber
                          && bf.DepartureDate == seg.DepartureDate
                          && bf.SeatStatus != "Available"
                          && !string.IsNullOrEmpty(bf.SeatNumber))
                .Select(bf => bf.SeatNumber)
                .ToListAsync();

            var takenSet = new HashSet<string>(
                taken.SelectMany(s => s.Split(',', StringSplitOptions.RemoveEmptyEntries)),
                StringComparer.OrdinalIgnoreCase);

            var assigned = new List<string>();
            for (var row = 1; row <= totalRows && assigned.Count < booking.Travellers; row++)
            {
                foreach (var col in columns)
                {
                    var seatId = $"{row}{col}";
                    if (takenSet.Add(seatId))
                        assigned.Add(seatId);
                    if (assigned.Count >= booking.Travellers) break;
                }
            }

            segments[i] = seg with { SeatNumber = string.Join(",", assigned.Take(booking.Travellers)) };
        }
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

    // GET api/bookings/{id}/refund-preview
    [HttpGet("{id:int}/refund-preview")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRefundPreview(int id)
    {
        var booking = await db.Bookings
            .Include(b => b.BookingFlights)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking is null) return NotFound(new { message = "Booking not found" });
        if (booking.Status == "cancelled" || booking.Status == "refunded")
            return BadRequest(new { message = "Booking is already cancelled/refunded" });

        var cancelService = cancellationService;
        var result = cancelService.CalculateRefund(booking);

        return Ok(new
        {
            bookingId = booking.Id,
            referenceNumber = booking.ReferenceNumber,
            totalAmount = booking.TotalAmount,
            daysSinceBooking = result.DaysSinceBooking,
            policyTier = result.PolicyTier,
            refundPercentage = result.RefundPercentage,
            refundAmount = result.RefundAmount,
            message = result.Message
        });
    }

    // POST api/bookings/{id}/cancel
    [HttpPost("{id:int}/cancel")]
    [AllowAnonymous]
    [EnableRateLimiting("anonymous-write")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        var booking = await db.Bookings
            .Include(b => b.BookingFlights)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking is null) return NotFound(new { message = "Booking not found" });
        if (booking.Status == "cancelled" || booking.Status == "refunded")
            return BadRequest(new { message = "Booking is already cancelled/refunded" });

        // Calculate refund
        var cancelService = cancellationService;
        var refund = cancelService.CalculateRefund(booking);

        // Generate refund reference
        var refundRef = $"RFND-{DateTime.UtcNow:yyyy}-{Random.Shared.Next(100000, 999999)}";

        // Release all reserved/sold seats back to Available
        foreach (var flight in booking.BookingFlights.Where(f => f.SeatStatus != "Available"))
        {
            flight.SeatStatus = "Available";
            flight.SeatNumber = string.Empty;
        }

        // Update booking status
        booking.Status = "refunded";
        booking.Paid = false;
        booking.CancelledAt = DateTime.UtcNow;
        booking.RefundAmount = refund.RefundAmount;
        booking.RefundReference = refundRef;
        booking.CancellationPolicyTier = refund.PolicyTier;
        booking.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        // Send cancellation email in background. The DI scope is created inside
        // the task so it is never disposed before the email sends (the scope
        // factory itself is a singleton and is safe to use from the background
        // task).
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();
                await emailService.SendCancellationEmailAsync(
                    booking, refund.RefundAmount, refundRef, refund.PolicyTier);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send cancellation email for booking {BookingId}", booking.Id);
            }
        });

        return Ok(new
        {
            success = true,
            bookingId = booking.Id,
            refundReference = refundRef,
            refundAmount = refund.RefundAmount,
            policyTier = refund.PolicyTier,
            refundPercentage = refund.RefundPercentage,
            message = refund.Message
        });
    }

    // POST api/bookings/{id}/itinerary-pdf
    [HttpPost("{id:int}/itinerary-pdf")]
    [AllowAnonymous]
    [EnableRateLimiting("anonymous-write")]
    public async Task<IActionResult> GenerateItineraryPdf(int id)
    {
        var booking = await db.Bookings
            .Include(b => b.BookingFlights.OrderBy(f => f.SegmentOrder))
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking is null) return NotFound(new { message = "Booking not found" });

        var pdfBytes = pdfService.GenerateItineraryPdf(booking, booking.BookingFlights.ToList());

        return File(pdfBytes, "application/pdf", $"TravelConnect-{booking.ReferenceNumber}.pdf");
    }

    // POST api/bookings/{id}/send-confirmation
    [HttpPost("{id:int}/send-confirmation")]
    public async Task<IActionResult> SendConfirmationEmail(int id)
    {
        var booking = await db.Bookings
            .Include(b => b.BookingFlights.OrderBy(f => f.SegmentOrder))
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking is null) return NotFound(new { message = "Booking not found" });

        try
        {
            using var scope = HttpContext.RequestServices.CreateScope();
            var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();
            await emailService.SendBookingConfirmationAsync(booking, booking.BookingFlights.ToList());
            return Ok(new { success = true, message = "Confirmation email sent" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to send email", error = ex.Message });
        }
    }
}