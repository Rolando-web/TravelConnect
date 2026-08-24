using Microsoft.AspNetCore.Mvc;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    [HttpPost("process")]
    public IActionResult ProcessPayment([FromBody] PaymentTransaction request)
    {
        if (request == null || request.Amount <= 0)
        {
            return BadRequest(new { message = "Invalid payment transaction parameters." });
        }

        var transaction = new PaymentTransaction
        {
            Id = Random.Shared.Next(1000, 9999),
            TransactionId = $"TXN-PAY-{DateTime.UtcNow.Ticks % 1000000:D6}",
            BookingReference = string.IsNullOrEmpty(request.BookingReference) ? $"TC-REF-{Random.Shared.Next(1000, 9999)}" : request.BookingReference,
            Amount = request.Amount,
            Currency = "USD",
            PaymentMethod = request.PaymentMethod,
            CardLastFour = request.CardLastFour,
            Status = "completed",
            ProcessedAt = DateTime.UtcNow
        };

        return Ok(new
        {
            success = true,
            message = "Payment processed successfully.",
            transaction
        });
    }
}
