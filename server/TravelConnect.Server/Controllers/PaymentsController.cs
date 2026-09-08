using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController(
    TravelConnectDbContext db,
    PayMongoService payMongo,
    PayMongoOptions payMongoOptions) : ControllerBase
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

            // Link the payment to the matching booking (by reference + customer email)
            // so that Payment.BookingId is no longer null.
            Booking? booking = null;
            if (!string.IsNullOrWhiteSpace(req.BookingReference))
            {
                booking = await db.Bookings
                    .OrderByDescending(b => b.Id)
                    .FirstOrDefaultAsync(b =>
                        (b.ReferenceNumber == req.BookingReference ||
                         b.PackageName == req.BookingReference) &&
                        (req.CustomerEmail == "" || b.CustomerEmail.ToLower() == req.CustomerEmail.ToLower()));
            }

            paymentId = paymentId == string.Empty ? req.SourceId : paymentId;

            var payment = new Payment
            {
                ReferenceId = paymentId,
                BookingId = booking?.Id,
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

            // If we linked to a booking, mark it paid.
            if (booking is not null)
            {
                booking.Paid = true;
                booking.TransactionId = paymentId;
                booking.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }

            return Ok(new
            {
                success = true,
                paymentId,
                transactionId = paymentId,
                paymentMethod = method,
                status = "completed",
                amount = req.Amount,
                bookingId = booking?.Id,
                processedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ── PayMongo Webhooks ──────────────────────────────────────────────
    // PayMongo calls this endpoint whenever a payment-related event occurs
    // (e.g. source.chargeable, payment.paid). You must set this URL in the
    // PayMongo dashboard and point it to a publicly reachable address
    // (use a reverse proxy / ngrok in development; your @yourdomain in prod).
    [HttpPost("paymongo/webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> HandlePayMongoWebhook()
    {
        string body;
        using (var reader = new StreamReader(Request.Body, System.Text.Encoding.UTF8))
        {
            body = await reader.ReadToEndAsync();
        }

        // PayMongo sends the webhook signature in the "Paymongo-Signature"
        // header, formatted as: t=<timestamp>,v1=<hmac-sha256-signature>
        var signatureHeader = Request.Headers["Paymongo-Signature"].FirstOrDefault()
            ?? Request.Headers["paymongo-signature"].FirstOrDefault()
            ?? string.Empty;

        var timestamp = string.Empty;
        var signature = string.Empty;
        foreach (var part in signatureHeader.Split(','))
        {
            var kv = part.Trim();
            if (kv.StartsWith("t=")) timestamp = kv[2..];
            else if (kv.StartsWith("v1=")) signature = kv[3..];
        }

        // Verify the webhook signature when a webhook secret key is configured.
        if (!string.IsNullOrWhiteSpace(payMongoOptions.WebhookSecretKey))
        {
            if (string.IsNullOrWhiteSpace(signature) ||
                !payMongo.VerifyWebhookSignature(body, signature, timestamp))
            {
                return Unauthorized(new { success = false, message = "Invalid webhook signature." });
            }
        }

        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            var data = root.TryGetProperty("data", out var d) ? d : root;
            var type = root.TryGetProperty("type", out var t) && t.ValueKind == JsonValueKind.String
                ? t.GetString() ?? string.Empty
                : (data.TryGetProperty("type", out var dt) ? dt.GetString() ?? string.Empty : string.Empty);

            var attributes = data.TryGetProperty("attributes", out var at) ? at : default;
            string? sourceId = null;
            string? paymentId = null;
            var amount = 0m;
            var status = string.Empty;

            if (attributes.ValueKind == JsonValueKind.Object)
            {
                if (attributes.TryGetProperty("id", out var aid) && aid.ValueKind == JsonValueKind.String)
                    paymentId = aid.GetString();

                if (attributes.TryGetProperty("amount", out var amt))
                    amount = amt.ValueKind == JsonValueKind.Number ? amt.GetDecimal() / 100m : 0m;

                if (attributes.TryGetProperty("status", out var st) && st.ValueKind == JsonValueKind.String)
                    status = st.GetString() ?? string.Empty;

                if (attributes.TryGetProperty("source", out var src) && src.ValueKind == JsonValueKind.Object &&
                    src.TryGetProperty("id", out var sid))
                    sourceId = sid.GetString();

                // Fallback for source events
                if (string.IsNullOrWhiteSpace(sourceId) && string.IsNullOrWhiteSpace(paymentId))
                    sourceId = attributes.TryGetProperty("id", out var rid) ? rid.GetString() : null;
            }

            // Payment events that signal success.
            if (type.Contains("payment") || type.Contains("charge") || type.Contains("source.chargeable"))
            {
                var statusKey = (status ?? "unknown").ToLowerInvariant() is "paid" or "chargeable" or "charged"
                    ? "Paid"
                    : (status ?? "unknown").ToLowerInvariant() is "failed" or "cancelled"
                        ? "Failed"
                        : "Pending";

                // Try to locate an existing pending payment (by PayMongo source id or payment id)
                Payment? payment = null;
                if (!string.IsNullOrWhiteSpace(paymentId))
                    payment = await db.Payments.FirstOrDefaultAsync(p => p.ReferenceId == paymentId);
                if (payment is null && !string.IsNullOrWhiteSpace(sourceId))
                    payment = await db.Payments.FirstOrDefaultAsync(p => p.ReferenceId == sourceId);

                if (payment is not null)
                {
                    payment.Status = statusKey;
                    payment.UpdatedAt = DateTime.UtcNow;
                    if (statusKey == "Paid")
                        payment.PaymentDate = DateTime.UtcNow.ToString("yyyy-MM-dd");

                    if (payment.BookingId is int bid)
                    {
                        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == bid);
                        if (booking is not null)
                        {
                            booking.Paid = statusKey == "Paid";
                            booking.Status = statusKey == "Paid" ? "upcoming" : booking.Status;
                            booking.TransactionId = paymentId ?? booking.TransactionId;
                            booking.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                    await db.SaveChangesAsync();
                }

                return Ok(new { success = true, received = true, type, status = statusKey });
            }

            // No-op for other events (payment_method, source.pending, etc.)
            return Ok(new { success = true, received = true, type });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    // ── Payment Reconciliation ──────────────────────────────────────

    // GET api/payments/reconciliation
    [HttpGet("reconciliation")]
    public async Task<IActionResult> GetReconciliation(
        [FromQuery] string? method = null,
        [FromQuery] string? status = null,
        [FromQuery] string? from = null,
        [FromQuery] string? to = null)
    {
        IQueryable<Payment> query = db.Payments
            .Include(p => p.Booking)
            .AsNoTracking()
            .OrderByDescending(p => p.UpdatedAt);

        if (!string.IsNullOrWhiteSpace(method))
            query = query.Where(p => p.Method.ToLower() == method.ToLower());
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status.ToLower() == status.ToLower());
        if (!string.IsNullOrWhiteSpace(from) && DateTime.TryParse(from, out var fromDate))
            query = query.Where(p => p.CreatedAt >= fromDate);
        if (!string.IsNullOrWhiteSpace(to) && DateTime.TryParse(to, out var toDate))
            query = query.Where(p => p.CreatedAt <= toDate.AddDays(1));

        var payments = await query.ToListAsync();

        var reconciliation = payments.Select(p => new
        {
            paymentId = p.Id,
            referenceId = p.ReferenceId,
            customerName = p.CustomerName,
            packageName = p.PackageName,
            amount = p.Amount,
            method = p.Method,
            status = p.Status,
            paymentDate = p.PaymentDate,
            createdAt = p.CreatedAt,
            bookingId = p.BookingId,
            bookingReference = p.Booking?.ReferenceNumber,
            bookingTransactionId = p.Booking?.TransactionId,
            bookingStatus = p.Booking?.Status,
            isMatched = p.BookingId != null &&
                        p.ReferenceId == p.Booking?.TransactionId,
            matchStatus = p.BookingId == null
                ? "unmatched_no_booking"
                : p.ReferenceId == p.Booking?.TransactionId
                    ? "matched"
                    : "mismatched_ids"
        });

        return Ok(reconciliation);
    }

    // POST api/payments/{id}/refund-to-wallet
    [HttpPost("{id:int}/refund-to-wallet")]
    public async Task<IActionResult> RefundToWallet(int id)
    {
        var payment = await db.Payments
            .Include(p => p.Booking)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (payment is null) return NotFound(new { message = "Payment not found" });
        if (payment.Status == "Refunded")
            return BadRequest(new { message = "Payment is already refunded" });

        // Update payment status
        payment.Status = "Refunded";
        payment.UpdatedAt = DateTime.UtcNow;

        // If linked to a booking, update booking status too
        if (payment.Booking is not null)
        {
            payment.Booking.Status = "refunded";
            payment.Booking.Paid = false;
            payment.Booking.RefundAmount = payment.Amount;
            payment.Booking.RefundReference = $"RFND-{DateTime.UtcNow:yyyy}-{Random.Shared.Next(100000, 999999)}";
            payment.Booking.CancelledAt = DateTime.UtcNow;
            payment.Booking.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            paymentId = payment.Id,
            refundAmount = payment.Amount,
            bookingId = payment.BookingId,
            message = $"Refund of ₱{payment.Amount:N2} processed to TravelConnect Money wallet"
        });
    }
}