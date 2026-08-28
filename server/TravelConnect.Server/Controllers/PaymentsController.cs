using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController(TravelConnectDbContext db, PayMongoService payMongo) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Payment>>> GetAll()
    {
        return await db.Payments
            .AsNoTracking()
            .OrderByDescending(e => e.UpdatedAt)
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Payment>> GetById(int id)
    {
        var entity = await db.Payments.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        return Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<Payment>> Create(Payment entity)
    {
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        db.Payments.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Payment entity)
    {
        if (id != entity.Id) return BadRequest(new { message = "ID mismatch" });
        var existing = await db.Payments.FirstOrDefaultAsync(e => e.Id == id);
        if (existing is null) return NotFound(new { message = "Record not found" });

        db.Entry(existing).CurrentValues.SetValues(entity);
        existing.UpdatedAt = DateTime.UtcNow;
        existing.CreatedAt = existing.CreatedAt switch
        {
            DateTime min when min == default => DateTime.UtcNow,
            _ => existing.CreatedAt
        };
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await db.Payments.FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        db.Payments.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── PayMongo (GCash / PayMaya) ───────────────────────────────

    private static readonly string[] AllowedMethods = new[] { "gcash", "paymaya" };

    public record CreateSourceRequest(
        string Method,
        decimal Amount,
        string? CustomerName = null,
        string? CustomerEmail = null,
        string? BookingReference = null,
        string? SuccessUrl = null,
        string? FailedUrl = null);

    public record CreatePaymentRequest(
        string SourceId,
        string Method,
        decimal Amount,
        string CustomerName,
        string CustomerEmail,
        string? BookingReference = null,
        string? PackageName = null);

    [HttpPost("paymongo/source")]
    public async Task<IActionResult> CreatePayMongoSource([FromBody] CreateSourceRequest req)
    {
        var method = req.Method?.ToLowerInvariant() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(method))
            return BadRequest(new { message = "Payment method is required (gcash or paymaya)." });
        if (!AllowedMethods.Contains(method))
            return BadRequest(new { message = "Only GCash and PayMaya are supported." });
        if (req.Amount <= 0)
            return BadRequest(new { message = "Amount must be greater than zero." });
        if (req.Amount < 20)
            return BadRequest(new { message = "Minimum payment amount is PHP 20.00." });

        var description = $"TravelConnect booking {req.BookingReference ?? "transactions"}";
        var successUrl = req.SuccessUrl ?? $"{Request.Scheme}://{Request.Host}/payment-result?status=success";
        var failedUrl = req.FailedUrl ?? $"{Request.Scheme}://{Request.Host}/payment-result?status=failed";

        try
        {
            var result = await payMongo.CreateSourceAsync(method, req.Amount, successUrl, failedUrl);
            return Ok(new
            {
                success = true,
                sourceId = result.SourceId,
                checkoutUrl = result.CheckoutUrl,
                status = result.Status
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("paymongo/source/{sourceId}")]
    public async Task<IActionResult> GetPayMongoSourceStatus(string sourceId)
    {
        try
        {
            var result = await payMongo.GetSourceAsync(sourceId);
            return Ok(new { success = true, sourceId = result.SourceId, status = result.Status, failureReason = result.FailureReason });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("paymongo/pay")]
    public async Task<IActionResult> CreatePayMongoPayment([FromBody] CreatePaymentRequest req)
    {
        var method = req.Method?.ToLowerInvariant() ?? string.Empty;
        if (!AllowedMethods.Contains(method))
            return BadRequest(new { message = "Only GCash and PayMaya are supported." });

        try
        {
            var statement = "TravelConnect";
            var description = req.PackageName ?? "TravelConnect booking";
            var paymentId = await payMongo.CreatePaymentAsync(req.Amount, req.SourceId, description, statement);

            var payment = new Payment
            {
                ReferenceId = req.SourceId,
                BookingId = null,
                CustomerName = req.CustomerName,
                PackageName = req.PackageName ?? "Travel Package",
                Amount = req.Amount,
                Method = method,
                Status = "Paid",
                PaymentDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Payments.Add(payment);
            await db.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                paymentId,
                transactionId = paymentId,
                paymentMethod = method,
                status = "completed",
                amount = req.Amount,
                processedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}