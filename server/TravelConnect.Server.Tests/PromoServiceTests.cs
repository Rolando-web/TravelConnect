using Xunit;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Unit tests for the shared PromoService rules: existence, status, expiry,
/// usage cap and discount math (percent vs flat).
/// </summary>
public class PromoServiceTests
{
    private static Promotion Promo(
        string code = "TEST10",
        string discountType = "Percent",
        decimal discount = 10m,
        int maxUses = 100,
        int usedCount = 0,
        string expiresAt = "2099-12-31",
        string status = "Active") => new()
    {
        Code = code,
        CampaignName = "Test Campaign",
        Description = "Test",
        Discount = discount,
        DiscountType = discountType,
        MaxUses = maxUses,
        UsedCount = usedCount,
        ExpiresAt = expiresAt,
        Status = status,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    [Fact]
    public async Task Valid_percent_code_computes_percentage_discount()
    {
        using var db = TestDb.Create();
        db.Promotions.Add(Promo("SUMMER10", "Percent", 10m));
        await db.SaveChangesAsync();

        var service = new PromoService(db);
        var result = await service.ValidateAsync("summer10", 5000m);

        Assert.True(result.IsValid);
        Assert.Equal("SUMMER10", result.Promo!.Code);
        Assert.Equal(500m, result.DiscountAmount);
        Assert.Equal(4500m, result.FinalAmount);
    }

    [Fact]
    public async Task Valid_flat_code_computes_flat_discount_capped_at_subtotal()
    {
        using var db = TestDb.Create();
        db.Promotions.Add(Promo("FLAT50", "Flat", 1500m));
        await db.SaveChangesAsync();

        var service = new PromoService(db);
        var result = await service.ValidateAsync("FLAT50", 4000m);
        Assert.True(result.IsValid);
        Assert.Equal(1500m, result.DiscountAmount);
        Assert.Equal(2500m, result.FinalAmount);

        var capped = await service.ValidateAsync("FLAT50", 800m);
        Assert.True(capped.IsValid);
        Assert.Equal(800m, capped.DiscountAmount);
        Assert.Equal(0m, capped.FinalAmount);
    }

    [Fact]
    public async Task Unknown_code_is_rejected()
    {
        using var db = TestDb.Create();
        await db.SaveChangesAsync();

        var service = new PromoService(db);
        var result = await service.ValidateAsync("NOPE42", 1000m);

        Assert.False(result.IsValid);
        Assert.Contains("not found", result.Error);
    }

    [Fact]
    public async Task Inactive_code_is_rejected()
    {
        using var db = TestDb.Create();
        db.Promotions.Add(Promo("OFF", status: "Inactive"));
        await db.SaveChangesAsync();

        var service = new PromoService(db);
        var result = await service.ValidateAsync("OFF", 1000m);

        Assert.False(result.IsValid);
        Assert.Contains("no longer active", result.Error);
    }

    [Fact]
    public async Task Expired_code_is_rejected()
    {
        using var db = TestDb.Create();
        db.Promotions.Add(Promo("OLD", expiresAt: "2020-01-01"));
        await db.SaveChangesAsync();

        var service = new PromoService(db);
        var result = await service.ValidateAsync("OLD", 1000m);

        Assert.False(result.IsValid);
        Assert.Contains("expired", result.Error);
    }

    [Fact]
    public async Task Exhausted_code_is_rejected()
    {
        using var db = TestDb.Create();
        db.Promotions.Add(Promo("USED", maxUses: 5, usedCount: 5));
        await db.SaveChangesAsync();

        var service = new PromoService(db);
        var result = await service.ValidateAsync("USED", 1000m);

        Assert.False(result.IsValid);
        Assert.Contains("usage limit", result.Error);
    }

    [Fact]
    public async Task Code_with_one_redemption_left_is_still_valid()
    {
        using var db = TestDb.Create();
        db.Promotions.Add(Promo("LAST", maxUses: 5, usedCount: 4));
        await db.SaveChangesAsync();

        var service = new PromoService(db);
        var result = await service.ValidateAsync("LAST", 1000m);
        Assert.True(result.IsValid);
    }

    [Fact]
    public async Task Empty_or_blank_code_is_rejected_with_hint()
    {
        using var db = TestDb.Create();
        var service = new PromoService(db);

        var result = await service.ValidateAsync("   ", 1000m);
        Assert.False(result.IsValid);
        Assert.Contains("enter a promo code", result.Error, StringComparison.OrdinalIgnoreCase);
    }
}