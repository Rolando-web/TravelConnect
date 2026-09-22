using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Services;

/// <summary>
/// Result of validating a promo code against the catalog rules.
/// </summary>
public record PromoValidation(string? Error, Promotion? Promo, decimal DiscountAmount, decimal FinalAmount)
{
    public bool IsValid => Error is null && Promo is not null;
}

/// <summary>
/// Single source of truth for promo-code validation and discount math, shared
/// by the public validation endpoint and the authoritative booking pipeline so
/// the client can never apply a code the server rejects (expired, inactive,
/// exhausted) or invent a discount amount.
/// </summary>
public class PromoService(TravelConnectDbContext db)
{
    public const int MaxCodeLength = 50;

    public async Task<PromoValidation> ValidateAsync(string code, decimal subtotal)
    {
        var normalized = (code ?? string.Empty).Trim();
        if (normalized.Length == 0)
            return new PromoValidation("Enter a promo code to continue.", null, 0m, subtotal);
        if (normalized.Length > MaxCodeLength)
            return new PromoValidation("That promo code is not valid.", null, 0m, subtotal);

        var promo = await db.Promotions
            .Where(p => p.Code.ToLower() == normalized.ToLower())
            .FirstOrDefaultAsync();

        if (promo is null)
            return new PromoValidation("Promo code not found.", null, 0m, subtotal);
        if (promo.Status != "Active")
            return new PromoValidation("This promo code is no longer active.", promo, 0m, subtotal);
        if (promo.MaxUses > 0 && promo.UsedCount >= promo.MaxUses)
            return new PromoValidation("This promo code has reached its usage limit.", promo, 0m, subtotal);
        if (DateOnly.TryParse(promo.ExpiresAt, out var expiry) && DateTime.UtcNow.Date > expiry.ToDateTime(TimeOnly.MinValue).Date)
            return new PromoValidation("This promo code has expired.", promo, 0m, subtotal);

        var sub = Math.Max(0m, subtotal);
        var isPercent = string.Equals(promo.DiscountType, "percent", StringComparison.OrdinalIgnoreCase);
        var discount = isPercent
            ? Math.Round(sub * (promo.Discount / 100m), 2, MidpointRounding.AwayFromZero)
            : Math.Min(sub, promo.Discount);

        return new PromoValidation(null, promo, discount, Math.Max(0m, sub - discount));
    }
}