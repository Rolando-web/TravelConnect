using Microsoft.AspNetCore.Mvc;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PromotionsController : ControllerBase
{
    private static readonly Dictionary<string, (decimal percentage, decimal flatDiscount, string label)> Promos = new(StringComparer.OrdinalIgnoreCase)
    {
        { "SUMMER26", (25, 0, "25% Summer Package Discount") },
        { "WELCOME50", (0, 50, "$50 Welcome Discount") },
        { "HONEYMOON", (10, 0, "10% Honeymoon Package Discount") },
        { "BALI15", (0, 15, "$15 Regional Discount") },
        { "EARLY2027", (25, 0, "25% Early Bird Discount") }
    };

    [HttpPost("validate")]
    public IActionResult ValidatePromo([FromBody] PromoValidationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new { valid = false, message = "Promo code cannot be empty." });
        }

        var code = request.Code.Trim();
        if (!Promos.TryGetValue(code, out var promoInfo))
        {
            return Ok(new
            {
                valid = false,
                message = "Invalid or expired promo code."
            });
        }

        decimal discount = 0;
        if (promoInfo.percentage > 0)
        {
            discount = request.TotalAmount * (promoInfo.percentage / 100m);
        }
        else
        {
            discount = promoInfo.flatDiscount;
        }

        if (discount > request.TotalAmount)
        {
            discount = request.TotalAmount;
        }

        return Ok(new
        {
            valid = true,
            code = code.ToUpper(),
            description = promoInfo.label,
            discountAmount = Math.Round(discount, 2),
            finalAmount = Math.Round(request.TotalAmount - discount, 2)
        });
    }
}

public class PromoValidationRequest
{
    public string Code { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
}
