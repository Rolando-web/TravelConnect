using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController(TravelConnectDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Summary()
    {
        var totalBookings = await db.Bookings.CountAsync();
        var totalRevenue = await db.Bookings.SumAsync(b => (decimal?)b.TotalAmount) ?? 0m;
        var completedBookings = await db.Bookings.CountAsync(b => b.Status == "Completed");
        var pendingBookings = await db.Bookings.CountAsync(b => b.Status == "Pending");
        var upcomingBookings = await db.Bookings.CountAsync(b => b.Status == "Upcoming");
        var cancelledBookings = await db.Bookings.CountAsync(b => b.Status == "Cancelled");

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
}