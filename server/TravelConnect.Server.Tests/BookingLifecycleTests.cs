using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Phase 14 — booking lifecycle. Confirms what happens to a booking after its
/// journey date passes: "upcoming" becomes "completed" (when viewed), while
/// cancelled / refunded / completed and still-future journeys are untouched.
/// Also covers the client-visible date math via TryTravelDate (latest flight
/// departure, else itinerary end date).
/// </summary>
public class BookingLifecycleTests
{
    private static async Task<BookingLifecycleService> SeedAsync(TravelConnectDbContext db, params Booking[] bookings)
    {
        db.Bookings.AddRange(bookings);
        await db.SaveChangesAsync();
        return new BookingLifecycleService(db);
    }

    private static Booking Booking(string status, string start, string? end = null, params BookingFlight[] flights) =>
        new()
        {
            ReferenceNumber = $"REF-{Guid.NewGuid():N}"[..8],
            CustomerName = "Test Traveller",
            CustomerEmail = "traveller@tc.com",
            PackageName = "Boracay Beach Escape",
            StartDate = start,
            EndDate = end ?? start,
            Travellers = 1,
            Subtotal = 100m,
            TotalAmount = 100m,
            Status = status,
            Paid = true,
            Category = "package",
            BookingFlights = flights.ToList()
        };

    private static BookingFlight Flight(string date) =>
        new()
        {
            Airline = "PAL",
            FlightNumber = "PR 102",
            DepartureCity = "Manila",
            ArrivalCity = "Cebu",
            DepartureTime = "07:00",
            ArrivalTime = "08:15",
            DepartureDate = date,
            SeatNumber = "12A",
            SeatStatus = "Sold"
        };

    private static string Past(int daysAgo = 2) => DateTime.UtcNow.Date.AddDays(-daysAgo).ToString("yyyy-MM-dd");
    private static string Future(int daysAhead = 8) => DateTime.UtcNow.Date.AddDays(daysAhead).ToString("yyyy-MM-dd");

    [Fact]
    public async Task Past_journey_advances_upcoming_to_completed()
    {
        using var db = TestDb.Create();
        var svc = await SeedAsync(db, Booking("upcoming", Past(), null, Flight(Past())));

        var changed = await svc.AdvanceExpiredAsync();

        Assert.Equal(1, changed);
        var saved = await db.Bookings.SingleAsync();
        Assert.Equal("completed", saved.Status);
    }

    [Fact]
    public async Task Future_journey_stays_upcoming()
    {
        using var db = TestDb.Create();
        var svc = await SeedAsync(db, Booking("upcoming", Future(), null, Flight(Future())));

        var changed = await svc.AdvanceExpiredAsync();

        Assert.Equal(0, changed);
        Assert.Equal("upcoming", (await db.Bookings.SingleAsync()).Status);
    }

    [Fact]
    public async Task Today_still_counts_as_upcoming()
    {
        using var db = TestDb.Create();
        var today = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
        var svc = await SeedAsync(db, Booking("upcoming", today));

        var changed = await svc.AdvanceExpiredAsync();

        Assert.Equal(0, changed);
    }

    [Fact]
    public async Task Cancelled_refunded_completed_never_touched()
    {
        using var db = TestDb.Create();
        var svc = await SeedAsync(
            db,
            Booking("cancelled", Past()),
            Booking("refunded", Past()),
            Booking("completed", Past()));

        var changed = await svc.AdvanceExpiredAsync();

        Assert.Equal(0, changed);
        Assert.All(await db.Bookings.ToListAsync(), b => Assert.NotEqual("upcoming", b.Status));
    }

    [Fact]
    public async Task Package_without_flights_uses_end_date()
    {
        using var db = TestDb.Create();
        var svc = await SeedAsync(db, Booking("upcoming", Past(3), Past(1)));

        var changed = await svc.AdvanceExpiredAsync();

        Assert.Equal(1, changed);
        Assert.Equal("completed", (await db.Bookings.SingleAsync()).Status);
    }

    [Fact]
    public async Task Latest_segment_wins()
    {
        using var db = TestDb.Create();
        // Segment 1 already passed, but segment 2 (return leg) is still future.
        var svc = await SeedAsync(db, Booking("upcoming", Past(), null, Flight(Past()), Flight(Future())));

        var changed = await svc.AdvanceExpiredAsync();

        Assert.Equal(0, changed);
        Assert.Equal("upcoming", (await db.Bookings.SingleAsync()).Status);
    }

    [Fact]
    public void TryTravelDate_prefers_latest_flight_over_itinerary_dates()
    {
        var booking = Booking("upcoming", Past(5), Future(2), Flight(Past(1)), Flight(Future(4)));

        var ok = BookingLifecycleService.TryTravelDate(booking, out var travel);

        Assert.True(ok);
        Assert.Equal(DateTime.Parse(Future(4)), travel.Date);
    }

    [Fact]
    public void TryTravelDate_unparseable_dates_are_not_a_travel_date()
    {
        var booking = Booking("upcoming", "not-a-date", "", Flight("also-invalid"));

        var ok = BookingLifecycleService.TryTravelDate(booking, out _);

        Assert.False(ok);
    }
}