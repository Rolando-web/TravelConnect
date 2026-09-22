using Microsoft.AspNetCore.Mvc;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Controllers;
using TravelConnect.Server.Services;
using Xunit;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Covers the public promo validation surface (GET /api/promotions/code/{code})
/// and CRUD endpoints.
/// </summary>
public class PromotionsControllerTests
{
    private static PromotionsController Controller(TravelConnectDbContext db) =>
        new(db, new PromoService(db));

    private static Promotion ActivePromo(string code = "SUMMER26", int maxUses = 100, int usedCount = 0) => new()
    {
        Code = code,
        CampaignName = "25% Summer Discount",
        Description = "Desc",
        Discount = 25m,
        DiscountType = "Percent",
        MaxUses = maxUses,
        UsedCount = usedCount,
        ExpiresAt = "2099-12-31",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    [Fact]
    public async Task GetByCode_returns_active_promo()
    {
        using var db = TestDb.Create();
        db.Promotions.Add(ActivePromo());
        await db.SaveChangesAsync();

        var ok = await Controller(db).GetByCode("summer26");
        var result = Assert.IsType<OkObjectResult>(ok.Result);
        var promo = Assert.IsType<Promotion>(result.Value);
        Assert.Equal("SUMMER26", promo.Code);
    }

    [Fact]
    public async Task GetByCode_unknown_code_returns_bad_request_message()
    {
        using var db = TestDb.Create();
        await db.SaveChangesAsync();

        var result = await Controller(db).GetByCode("NOPE99");
        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var json = TestDb.ToJson(bad.Value);
        Assert.Contains("not found", json.GetProperty("message").GetString());
    }

    [Fact]
    public async Task GetByCode_expired_code_is_rejected()
    {
        using var db = TestDb.Create();
        var promo = ActivePromo("OLD50");
        promo.Discount = 50m;
        promo.ExpiresAt = "2020-01-01";
        db.Promotions.Add(promo);
        await db.SaveChangesAsync();

        var result = await Controller(db).GetByCode("OLD50");
        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var json = TestDb.ToJson(bad.Value);
        Assert.Contains("expired", json.GetProperty("message").GetString());
    }

    [Fact]
    public async Task GetByCode_inactive_code_is_rejected()
    {
        using var db = TestDb.Create();
        var promo = ActivePromo("OFFED");
        promo.Status = "Inactive";
        db.Promotions.Add(promo);
        await db.SaveChangesAsync();

        var result = await Controller(db).GetByCode("OFFED");
        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var json = TestDb.ToJson(bad.Value);
        Assert.Contains("no longer active", json.GetProperty("message").GetString());
    }

    [Fact]
    public async Task GetByCode_exhausted_code_is_rejected()
    {
        using var db = TestDb.Create();
        var promo = ActivePromo("SPENT", maxUses: 3, usedCount: 3);
        db.Promotions.Add(promo);
        await db.SaveChangesAsync();

        var result = await Controller(db).GetByCode("SPENT");
        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var json = TestDb.ToJson(bad.Value);
        Assert.Contains("usage limit", json.GetProperty("message").GetString());
    }

    [Fact]
    public async Task GetAll_returns_promotions_sorted_by_update_desc()
    {
        using var db = TestDb.Create();
        var a = ActivePromo("A1");
        a.UpdatedAt = new DateTime(2026, 1, 1);
        var b = ActivePromo("B2");
        b.UpdatedAt = new DateTime(2026, 2, 1);
        db.Promotions.AddRange(a, b);
        await db.SaveChangesAsync();

        var ok = await Controller(db).GetAll();
        var value = Assert.IsAssignableFrom<IEnumerable<Promotion>>(ok.Value);
        Assert.Equal(2, value.Count());
        Assert.Equal("B2", value.First().Code);
    }

    [Fact]
    public async Task Create_then_Update_then_Delete_roundtrip()
    {
        using var db = TestDb.Create();
        var controller = Controller(db);

        var promo = ActivePromo("NEW5");
        promo.Discount = 5m;
        var created = await controller.Create(promo);
        var createdResult = Assert.IsType<CreatedAtActionResult>(created.Result);
        var saved = Assert.IsType<Promotion>(createdResult.Value);

        var updated = new Promotion
        {
            Id = saved.Id,
            Code = saved.Code,
            CampaignName = "Renamed",
            Description = saved.Description,
            Discount = saved.Discount,
            DiscountType = saved.DiscountType,
            MaxUses = saved.MaxUses,
            UsedCount = saved.UsedCount,
            ExpiresAt = saved.ExpiresAt,
            Status = saved.Status,
            CreatedAt = saved.CreatedAt,
            UpdatedAt = saved.UpdatedAt
        };
        var update = await controller.Update(saved.Id, updated);
        Assert.IsType<NoContentResult>(update);

        var reloaded = await db.Promotions.FindAsync(saved.Id);
        Assert.Equal("Renamed", reloaded!.CampaignName);

        var deleted = await controller.Delete(saved.Id);
        Assert.IsType<NoContentResult>(deleted);
        Assert.Null(await db.Promotions.FindAsync(saved.Id));
    }
}