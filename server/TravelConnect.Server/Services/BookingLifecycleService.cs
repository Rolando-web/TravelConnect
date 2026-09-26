using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Services;

/// <summary>
/// Booking lifecycle reconciliation — the "what happens after the travel date"
/// rule. Bookings are created as "upcoming"; once the journey date has passed
/// (latest flight departure, else the itinerary start date), they are advanced
/// to "completed" so the client's flight status card and My Bookings stop
/// showing a future journey and move it to Past Journeys automatically.
/// Called lazily from the booking read endpoints so the flip happens the next
/// time anyone opens bookings, with no scheduled job needed.
/// Cancelled / refunded / completed bookings are never touched.
/// </summary>
public class BookingLifecycleService(TravelConnectDbContext db)
{
    /// <summary>Marks "upcoming" bookings whose travel date is in the past as
    /// "completed". Returns how many were advanced.</summary>
    public async Task<int> AdvanceExpiredAsync(CancellationToken ct = default)
    {
        var candidates = await db.Bookings
            .Where(b => b.Status == "upcoming")
            .Include(b => b.BookingFlights)
            .ToListAsync(ct);

        var today = DateTime.UtcNow.Date;
        var expired = new List<Booking>();
        foreach (var booking in candidates)
        {
            if (TryTravelDate(booking, out var travel) && travel.Date < today)
                expired.Add(booking);
        }

        if (expired.Count == 0) return 0;

        var now = DateTime.UtcNow;
        foreach (var booking in expired)
        {
            booking.Status = "completed";
            booking.UpdatedAt = now;
        }
        return await db.SaveChangesAsync(ct);
    }

    /// <summary>The latest departure across all segments; falls back to the
    /// itinerary end (then start) date when the booking has no flight legs.</summary>
    public static bool TryTravelDate(Booking booking, out DateTime travel)
    {
        var parsed = booking.BookingFlights
            .Where(f => !string.IsNullOrWhiteSpace(f.DepartureDate))
            .Select(f => DateTime.TryParse(f.DepartureDate, out var d) ? d : (DateTime?)null)
            .Where(d => d.HasValue)
            .Select(d => d!.Value)
            .ToList();

        DateTime? resolved = parsed.Count > 0
            ? parsed.Max(d => d)
            : DateTime.TryParse(booking.EndDate, out var e) ? e
            : DateTime.TryParse(booking.StartDate, out var s) ? s
            : null;

        travel = resolved ?? default;
        return resolved.HasValue;
    }
}