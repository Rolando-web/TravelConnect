using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class DashboardController(TravelConnectDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Summary()
    {
        var totalBookings = await db.Bookings.CountAsync();
        var totalRevenue = await db.Bookings.SumAsync(b => (decimal?)b.TotalAmount) ?? 0m;
        var completedBookings = await db.Bookings.CountAsync(b => b.Status.ToLower() == "completed");
        var pendingBookings = await db.Bookings.CountAsync(b => b.Status.ToLower() == "pending");
        var upcomingBookings = await db.Bookings.CountAsync(b => b.Status.ToLower() == "upcoming");
        var cancelledBookings = await db.Bookings.CountAsync(b => b.Status.ToLower() == "cancelled" || b.Status.ToLower() == "refunded");

        var customers = await db.Customers.CountAsync();
        var suppliers = await db.Suppliers.CountAsync();
        var packages = await db.Packages.CountAsync();
        var leads = await db.Leads.CountAsync();
        var inquiries = await db.Inquiries.CountAsync();
        var activePromos = await db.Promotions.CountAsync(p => p.Status == "Active");

        var paymentsCollected = await db.Payments
            .Where(p => p.Status == "Paid")
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;
        var pendingPayments = await db.Payments.CountAsync(p => p.Status == "Pending");
        var refundedPayments = await db.Payments.CountAsync(p => p.Status == "Refunded");

        return Ok(new
        {
            bookings = new
            {
                total = totalBookings,
                completed = completedBookings,
                pending = pendingBookings,
                upcoming = upcomingBookings,
                cancelled = cancelledBookings,
                revenue = totalRevenue
            },
            customers,
            suppliers,
            packages,
            leads,
            inquiries,
            activePromotions = activePromos,
            payments = new
            {
                collected = paymentsCollected,
                pending = pendingPayments,
                refunded = refundedPayments
            }
        });
    }

    [HttpGet("public")]
    [AllowAnonymous]
    public async Task<IActionResult> PublicStats()
    {
        var happyTravelers = await db.Customers.CountAsync();
        var countriesCovered = await db.Customers
            .Where(c => c.Country != null && c.Country != "")
            .Select(c => c.Country).Distinct().CountAsync();
        var destinations = await db.Destinations.CountAsync();
        var packages = await db.Packages.CountAsync();
        var hotels = await db.Hotels.CountAsync();
        var cars = await db.Cars.CountAsync();
        var flights = await db.Flights.CountAsync();
        var activities = await db.Activities.CountAsync();
        var suppliers = await db.Suppliers.CountAsync();
        var bookings = await db.Bookings.CountAsync();

        var ratings = new List<decimal>();
        ratings.AddRange(await db.Packages.Where(p => p.Rating > 0).Select(p => p.Rating).ToListAsync());
        ratings.AddRange(await db.Hotels.Where(h => h.Rating > 0).Select(h => h.Rating).ToListAsync());
        ratings.AddRange(await db.Activities.Where(a => a.Rating > 0).Select(a => a.Rating).ToListAsync());
        ratings.AddRange(await db.Suppliers.Where(s => s.Rating > 0).Select(s => s.Rating).ToListAsync());
        var avgRating = ratings.Count > 0 ? Math.Round(ratings.Average(), 1) : 0m;

        return Ok(new
        {
            happyTravelers,
            countriesCovered,
            avgRating,
            destinations,
            packages,
            hotels,
            cars,
            flights,
            activities,
            suppliers,
            bookings
        });
    }
}