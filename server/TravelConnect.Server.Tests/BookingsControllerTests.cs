using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using TravelConnect.Server.Data;
using TravelConnect.Server.Controllers;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;
using Xunit;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Verifies the checkout contract: the booking endpoint re-validates the promo
/// code server-side, recomputes the discount authoritatively, consumes a
/// redemption, and rejects forged discounts.
/// </summary>
public class BookingsControllerTests
{
    private static BookingsController Controller(TravelConnectDbContext db)
    {
        var services = new ServiceCollection();
        services.AddSingleton(Options.Create(new EmailOptions()));
        services.AddSingleton<EmailService>();
        var provider = services.BuildServiceProvider();

        return new BookingsController(
            db,
            provider.GetRequiredService<IServiceScopeFactory>(),
            new PdfService(),
            new CancellationService(),
            new PromoService(db),
            new BookingLifecycleService(db),
            NullLogger<BookingsController>.Instance);
    }

    private static Booking Booking(decimal subtotal, string promoCode = "", decimal discountAmount = 0m, decimal totalAmount = 0m)
    {
        var total = totalAmount > 0 ? totalAmount : Math.Max(0m, subtotal - discountAmount);
        return new Booking
        {
            CustomerName = "Juan Dela Cruz",
            CustomerEmail = "juan@tc.com",
            CustomerPhone = "+63 900 000 0000",
            PackageName = "Boracay Escape",
            PackageId = 1,
            Location = "Philippines",
            StartDate = "2026-10-01",
            EndDate = "2026-10-05",
            Travellers = 2,
            Subtotal = subtotal,
            DiscountAmount = discountAmount,
            TotalAmount = total,
            PromoCodeUsed = promoCode,
            Status = "upcoming",
            Paid = true,
            PaymentMethod = "gcash",
            TransactionId = "TXN-123456",
            Category = "package"
        };
    }

    private static Promotion Promo(
        string code,
        string type = "Percent",
        decimal discount = 10m,
        int maxUses = 100,
        int usedCount = 0,
        string expiresAt = "2099-12-31",
        string status = "Active") => new()
    {
        Code = code,
        CampaignName = "Campaign",
        Description = "Desc",
        Discount = discount,
        DiscountType = type,
        MaxUses = maxUses,
        UsedCount = usedCount,
        ExpiresAt = expiresAt,
        Status = status,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    [Fact]
    public async Task Create_applies_percent_promo_and_consumes_redemption()
    {
        using var db = TestDb.Create();
        db.Promotions.Add(Promo("PCT20", "Percent", 20m));
        await db.SaveChangesAsync();

        var req = new BookingsController.CreateBookingRequest(Booking(5000m, promoCode: "PCT20"), null);
        var result = await Controller(db).Create(req);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var saved = Assert.IsType<Booking>(created.Value);

        Assert.Equal("PCT20", saved.PromoCodeUsed);
        Assert.Equal(1000m, saved.DiscountAmount);
        Assert.Equal(4000m, saved.TotalAmount);

        var promo = await db.Promotions.SingleAsync(p => p.Code == "PCT20");
        Assert.Equal(1, promo.UsedCount);
        Assert.Equal(1, await db.Bookings.CountAsync());
    }

    [Fact]
    public async Task Create_applies_flat_promo_capped_at_subtotal()
    {
        using var db = TestDb.Create();
        db.Promotions.Add(Promo("FLAT1500", "Flat", 1500m));
        await db.SaveChangesAsync();

        var req = new BookingsController.CreateBookingRequest(Booking(3000m, promoCode: "FLAT1500"), null);
        var result = await Controller(db).Create(req);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var saved = Assert.IsType<Booking>(created.Value);
        Assert.Equal(1500m, saved.DiscountAmount);
        Assert.Equal(1500m, saved.TotalAmount);
        Assert.Equal(1, (await db.Promotions.SingleAsync(x => x.Code == "FLAT1500")).UsedCount);
    }

    [Fact]
    public async Task Create_ignores_client_discount_when_no_code_sent()
    {
        using var db = TestDb.Create();
        db.Promotions.Add(Promo("UNUSED"));
        await db.SaveChangesAsync();

        var forged = Booking(4000m, promoCode: "", discountAmount: 3000m, totalAmount: 1000m);
        var result = await Controller(db).Create(new BookingsController.CreateBookingRequest(forged, null));

        var createdAt = Assert.IsType<CreatedAtActionResult>(result.Result);
        var saved = Assert.IsType<Booking>(createdAt.Value);

        Assert.Equal("", saved.PromoCodeUsed);
        Assert.Equal(0m, saved.DiscountAmount);
        // Total untouched so non-promo bookings (e.g. luggage add-ons) keep
        // their client-computed amount; only discount claims are rejected.
        Assert.Equal(1000m, saved.TotalAmount);
        Assert.Equal(0, (await db.Promotions.SingleAsync(p => p.Code == "UNUSED")).UsedCount);
    }

    [Fact]
    public async Task Create_rejects_expired_promo_and_does_not_persist_booking()
    {
        using var db = TestDb.Create();
        db.Promotions.Add(Promo("STALE", expiresAt: "2020-05-01"));
        await db.SaveChangesAsync();

        var result = await Controller(db).Create(
            new BookingsController.CreateBookingRequest(Booking(2000m, promoCode: "STALE"), null));

        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var json = TestDb.ToJson(bad.Value);
        Assert.Contains("expired", json.GetProperty("message").GetString());
        Assert.Equal(0, await db.Bookings.CountAsync());
        Assert.Equal(0, (await db.Promotions.SingleAsync(p => p.Code == "STALE")).UsedCount);
    }

    [Fact]
    public async Task Create_rejects_exhausted_promo_and_does_not_persist_booking()
    {
        using var db = TestDb.Create();
        db.Promotions.Add(Promo("SPENT", maxUses: 2, usedCount: 2));
        await db.SaveChangesAsync();

        var result = await Controller(db).Create(
            new BookingsController.CreateBookingRequest(Booking(2000m, promoCode: "SPENT"), null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(0, await db.Bookings.CountAsync());
    }

    [Fact]
    public async Task Create_rejects_unknown_promo()
    {
        using var db = TestDb.Create();
        await db.SaveChangesAsync();

        var result = await Controller(db).Create(
            new BookingsController.CreateBookingRequest(Booking(2000m, promoCode: "FAKE99"), null));

        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var json = TestDb.ToJson(bad.Value);
        Assert.Contains("not found", json.GetProperty("message").GetString());
        Assert.Equal(0, await db.Bookings.CountAsync());
    }

    [Fact]
    public async Task Create_without_promo_persists_unchanged_totals()
    {
        using var db = TestDb.Create();
        db.Promotions.Add(Promo("FREE"));
        await db.SaveChangesAsync();

        var result = await Controller(db).Create(
            new BookingsController.CreateBookingRequest(Booking(2500m), null));

        var createdAt = Assert.IsType<CreatedAtActionResult>(result.Result);
        var saved = Assert.IsType<Booking>(createdAt.Value);
        Assert.Equal(2500m, saved.Subtotal);
        Assert.Equal(2500m, saved.TotalAmount);
        Assert.Equal(0m, saved.DiscountAmount);
        Assert.Equal(0, (await db.Promotions.SingleAsync(p => p.Code == "FREE")).UsedCount);
    }
}