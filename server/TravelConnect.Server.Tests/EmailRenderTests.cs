using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Tests;

/// <summary>
/// The booking-confirmation email used to render flights in one wide 5-column
/// table; on narrow phone screens the right-most "Seat" column was clipped and
/// the seat number was invisible. Each flight now renders as its own stacked
/// card (label + value rows) so the seat is always readable on mobile.
/// </summary>
public class EmailRenderTests
{
    private static Booking SampleBooking() => new()
    {
        ReferenceNumber = "TC-12345",
        CustomerName = "Anne Reyes",
        CustomerEmail = "anne@tc.com",
        CustomerPhone = "+63917 000 0000",
        Travellers = 2,
        PackageName = "Boracay Escape",
        Location = "Boracay",
        StartDate = "2026-10-01",
        EndDate = "2026-10-05",
        PaymentMethod = "Card",
        TotalAmount = 12000m,
    };

    private static List<BookingFlight> SampleFlights() =>
    [
        new BookingFlight
        {
            Airline = "Cebu Pacific",
            FlightNumber = "5J 501",
            DepartureCity = "Manila",
            ArrivalCity = "Boracay",
            DepartureDate = "2026-10-01",
            DepartureTime = "09:30",
            ArrivalTime = "10:40",
            Class = "Economy",
            SeatNumber = "12A,12B",
        }
    ];

    [Fact]
    public void BookingConfirmation_renders_every_seat_badge()
    {
        var html = EmailService.BuildBookingConfirmationHtml(SampleBooking(), SampleFlights());

        Assert.Contains("12A", html);
        Assert.Contains("12B", html);
        Assert.Contains("Seat", html);
    }

    [Fact]
    public void BookingConfirmation_uses_mobile_viewport_meta()
    {
        var html = EmailService.BuildBookingConfirmationHtml(SampleBooking(), SampleFlights());

        Assert.Contains("width=device-width,initial-scale=1", html);
    }

    [Fact]
    public void BookingConfirmation_flights_render_as_stacked_cards_not_wide_table()
    {
        var html = EmailService.BuildBookingConfirmationHtml(SampleBooking(), SampleFlights());

        // The old 5-column itinerary header table is gone; flights stack.
        Assert.DoesNotContain("<th", html);
        Assert.Contains("Flight Itinerary", html);
    }

    [Fact]
    public void BookingConfirmation_route_is_readable_in_the_card()
    {
        var html = EmailService.BuildBookingConfirmationHtml(SampleBooking(), SampleFlights());

        Assert.Contains("Manila → Boracay", html);
    }
}