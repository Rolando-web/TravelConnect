using TravelConnect.Server.Models;

namespace TravelConnect.Server.Services;

/// <summary>
/// Resolves the exact departure moment of a booking: the latest segment
/// departure (date + departure time when it parses), falling back to the
/// itinerary end date. The cancellation policy needs a real timestamp — a
/// "no-show" is measured in hours, not days, and BookingLifecycleService only
/// tracks the date for the upcoming → completed flip.
/// Times are handled in the same frame of reference as the rest of the booking
/// data (CreatedAt is UTC, itinerary dates are stored as plain date strings).
/// </summary>
public static class BookingDeparture
{
    public static DateTime? Resolve(Booking? booking)
    {
        if (booking is null) return null;

        var candidates = new List<DateTime>();
        foreach (var segment in booking.BookingFlights ?? [])
        {
            if (!DateTime.TryParse(segment.DepartureDate, out var date)) continue;
            var departure = date.Date;
            if (!string.IsNullOrWhiteSpace(segment.DepartureTime) &&
                TimeSpan.TryParse(segment.DepartureTime, out var time))
            {
                departure += time;
            }
            candidates.Add(DateTime.SpecifyKind(departure, DateTimeKind.Utc));
        }

        if (candidates.Count > 0) return candidates.Max();

        if (DateTime.TryParse(booking.EndDate, out var end))
            return DateTime.SpecifyKind(end.Date, DateTimeKind.Utc);
        if (DateTime.TryParse(booking.StartDate, out var start))
            return DateTime.SpecifyKind(start.Date, DateTimeKind.Utc);
        return null;
    }

    /// <summary>Whole hours between two instants, rounded down.</summary>
    public static int HoursBetween(DateTime from, DateTime to) =>
        (int)Math.Floor((to - from).TotalHours);
}
