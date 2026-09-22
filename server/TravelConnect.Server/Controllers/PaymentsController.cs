using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class PaymentsController(
    TravelConnectDbContext db,
    PayMongoService payMongo,
    PayMongoOptions payMongoOptions) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Payment>>> GetAll(int? page = null, int? pageSize = null)
    {
        // Server-side page-size cap (generous default, hard 500 max).
        var ps = Math.Clamp(pageSize ?? 200, 1, 500);
        IQueryable<Payment> query = db.Payments
            .AsNoTracking()
            .OrderByDescending(e => e.UpdatedAt);
        if (page is > 0)
            query = query.Skip((page.Value - 1) * ps);
        return await query.Take(ps).ToListAsync();
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

    private static readonly string[] AllowedMethods = new[] { "gcash", "paymaya", "card" };

    public record CreateCheckoutRequest(
        string Method,
        decimal Amount,
        string? CustomerName = null,
        string? CustomerEmail = null,
        string? BookingReference = null);

    public record CreatePaymentRequest(
        string SessionId,
        string Method,
        decimal Amount,
        string CustomerName,
        string CustomerEmail,
        string? BookingReference = null,
        string? PackageName = null,
        string? SenderName = null,
        string? SenderMobile = null);

    // POST api/payments/paymongo/checkout
    // Creates a PayMongo-hosted Checkout Session whose checkout_url points to
    // PayMongo's page (checkout.paymongo.com/<id>). The customer completes the
    // payment entirely on that hosted page — no in-app authorize shortcut.
    [HttpPost("paymongo/checkout")]
    [AllowAnonymous]
    [EnableRateLimiting("anonymous-write")]
    public async Task<IActionResult> CreatePayMongoCheckout([FromBody] CreateCheckoutRequest req)
    {
        var method = req.Method?.ToLowerInvariant() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(method))
            return BadRequest(new { message = "Payment method is required (gcash, paymaya or card)." });
        if (!AllowedMethods.Contains(method))
            return BadRequest(new { message = "Only GCash, PayMaya and credit/debit cards are supported." });
        if (req.Amount <= 0)
            return BadRequest(new { message = "Amount must be greater than zero." });
        if (req.Amount < 20)
            return BadRequest(new { message = "Minimum payment amount is PHP 20.00." });

        var description = $"TravelConnect booking {req.BookingReference ?? "transactions"}";
        var successUrl = $"{Request.Scheme}://{Request.Host}/payment-result?status=success";
        var cancelUrl = $"{Request.Scheme}://{Request.Host}/payment-result?status=cancelled";

        try
        {
            var result = await payMongo.CreateCheckoutSessionAsync(
                (long)Math.Round(req.Amount * 100),
                new[] { method },
                description,
                successUrl,
                cancelUrl,
                req.BookingReference);

            if (string.IsNullOrWhiteSpace(result.CheckoutUrl))
                return BadRequest(new { success = false, message = "PayMongo did not return a hosted checkout URL." });

            return Ok(new
            {
                success = true,
                sessionId = result.SessionId,
                checkoutUrl = result.CheckoutUrl,
                status = result.Status
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // GET api/payments/paymongo/checkout/{sessionId}
    // Polls a hosted Checkout Session for its payment outcome.
    [HttpGet("paymongo/checkout/{sessionId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPayMongoCheckoutStatus(string sessionId)
    {
        try
        {
            var result = await payMongo.GetCheckoutSessionAsync(sessionId);
            return Ok(new { success = true, sessionId = result.SessionId, status = result.Status, failureReason = result.FailureReason });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // POST api/payments/paymongo/pay
    // The charge already happened on the PayMongo-hosted page, so this only
    // records the completed payment locally, links it to the booking, and
    // returns the transaction id for the confirmation screen.
    [HttpPost("paymongo/pay")]
    [AllowAnonymous]
    [EnableRateLimiting("anonymous-write")]
    public async Task<IActionResult> CreatePayMongoPayment([FromBody] CreatePaymentRequest req)
    {
        var method = req.Method?.ToLowerInvariant() ?? string.Empty;
        if (!AllowedMethods.Contains(method))
            return BadRequest(new { message = "Only GCash, PayMaya and credit/debit cards are supported." });

        try
        {
            var paymentId = string.IsNullOrWhiteSpace(req.SessionId)
                ? $"TXN-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(100000, 999999)}"
                : req.SessionId;

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

            // Upsert: a retry for the same session must not duplicate records.
            var payment = await db.Payments.FirstOrDefaultAsync(p => p.ReferenceId == paymentId);
            if (payment is null)
            {
                payment = new Payment { ReferenceId = paymentId };
                db.Payments.Add(payment);
            }
            payment.BookingId = booking?.Id;
            payment.CustomerName = req.CustomerName;
            payment.PackageName = req.PackageName ?? "Travel Package";
            payment.SenderName = req.SenderName ?? string.Empty;
            payment.SenderMobile = req.SenderMobile ?? string.Empty;
            payment.Amount = req.Amount;
            payment.Method = method;
            payment.Status = "Paid";
            payment.PaymentDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
            payment.CreatedAt = payment.CreatedAt == default ? DateTime.UtcNow : payment.CreatedAt;
            payment.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            // If we linked to a booking, mark it paid.
            if (booking is not null && !booking.Paid)
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

    // ── Credit / Debit Card (in-app Payment Intents + 3-D Secure) ──────

    public record CardIntentRequest(
        decimal Amount,
        string? BookingReference = null,
        string? ReturnUrl = null);

    public record CardAttachRequest(
        string IntentId,
        string CardNumber,
        int ExpMonth,
        int ExpYear,
        string Cvc,
        string? HolderName = null,
        string? BookingReference = null,
        string? CustomerEmail = null);

    // POST api/payments/paymongo/card/intent
    // Creates a card-only Payment Intent. The return_url is where PayMongo
    // sends the 3-D Secure redirect when it completes (a dedicated popup page).
    [HttpPost("paymongo/card/intent")]
    [AllowAnonymous]
    [EnableRateLimiting("anonymous-write")]
    public async Task<IActionResult> CreateCardIntent([FromBody] CardIntentRequest req)
    {
        if (req.Amount <= 0)
            return BadRequest(new { message = "Amount must be greater than zero." });
        if (req.Amount < 20)
            return BadRequest(new { message = "Minimum payment amount is PHP 20.00." });

        var description = $"TravelConnect booking {req.BookingReference ?? "transactions"}";
        var origin = $"{Request?.Scheme ?? "http"}://{Request?.Host ?? new Microsoft.AspNetCore.Http.HostString("localhost")}";
        var returnUrl = string.IsNullOrWhiteSpace(req.ReturnUrl)
            ? $"{origin}/payment-result?status=success"
            : req.ReturnUrl;

        try
        {
            var result = await payMongo.CreateCardPaymentIntentAsync(
                (long)Math.Round(req.Amount * 100),
                description,
                returnUrl,
                req.BookingReference);

            if (string.IsNullOrWhiteSpace(result.IntentId))
                return BadRequest(new { success = false, message = "PayMongo did not create a payment intent." });

            return Ok(new
            {
                success = true,
                intentId = result.IntentId,
                clientKey = result.ClientKey,
                status = result.Status
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // POST api/payments/paymongo/card/attach
    // Tokenizes the entered card and attaches it to the intent. PayMongo then
    // either succeeds immediately or escalates to 3-D Secure (next_action.redirect).
    [HttpPost("paymongo/card/attach")]
    [AllowAnonymous]
    [EnableRateLimiting("anonymous-write")]
    public async Task<IActionResult> AttachCard([FromBody] CardAttachRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.IntentId))
            return BadRequest(new { message = "Payment intent id is required." });

        var number = req.CardNumber?.Replace(" ", string.Empty) ?? string.Empty;
        var brand = CardUtils.CardBrand(number);
        if (!CardUtils.IsValidLuhn(number) && !CardUtils.IsSandboxTestCard(number))
            return BadRequest(new { message = "Please double-check the card number (invalid digits)." });
        if (!CardUtils.IsValidExpiry(req.ExpMonth, req.ExpYear))
            return BadRequest(new { message = "The card expiry date is in the past or invalid." });
        if (!CardUtils.IsValidCvc(req.Cvc ?? string.Empty, brand))
            return BadRequest(new { message = "The CVV/CVC must be 3 digits (4 for American Express)." });
        var emailInvalid = false;
        if (!string.IsNullOrWhiteSpace(req.CustomerEmail))
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(req.CustomerEmail.Trim());
                emailInvalid = !addr.Address.Equals(req.CustomerEmail.Trim(), StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                emailInvalid = true;
            }
        }
        if (emailInvalid)
            return BadRequest(new { message = "A valid email address is required to process the card." });

        try
        {
            var result = await payMongo.AttachCardToPaymentIntentAsync(req.IntentId, new CardDetails(
                number, req.ExpMonth, req.ExpYear, req.Cvc?.Trim() ?? string.Empty,
                req.HolderName, req.CustomerEmail?.Trim()));

            return Ok(new
            {
                success = true,
                intentId = result.IntentId,
                status = result.Status,
                nextAction = string.IsNullOrWhiteSpace(result.RedirectUrl)
                    ? null
                    : new { type = "redirect", redirectUrl = result.RedirectUrl },
                failureReason = result.FailureReason,
                cardBrand = brand
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // GET api/payments/paymongo/card/{intentId}
    // Polls a Payment Intent after 3-D Secure. Once "succeeded" the payment is
    // recorded server-side (idempotent by ReferenceId = intentId) and the
    // linked booking is marked paid.
    [HttpGet("paymongo/card/{intentId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCardIntentStatus(string intentId)
    {
        if (string.IsNullOrWhiteSpace(intentId))
            return BadRequest(new { message = "Payment intent id is required." });

        try
        {
            var result = await payMongo.GetCardPaymentIntentAsync(intentId);

            string? paymentId = null;
            if (result.Status == "succeeded")
            {
                paymentId = await RecordCompletedCardPaymentAsync(result);
            }

            return Ok(new
            {
                success = true,
                intentId = result.IntentId,
                status = result.Status == "succeeded" ? "paid" : result.Status,
                failureReason = result.FailureReason,
                paymentId
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // Upserts the payment row keyed by the intent id (idempotent — a poll
    // retry can never double-insert) and marks the linked booking as paid.
    private async Task<string> RecordCompletedCardPaymentAsync(CardPaymentIntentResult result)
    {
        var bookingRef = result.BookingReference;
        var payment = await db.Payments.FirstOrDefaultAsync(p => p.ReferenceId == result.IntentId);
        if (payment is null)
        {
            payment = new Payment { ReferenceId = result.IntentId, CreatedAt = DateTime.UtcNow };
            db.Payments.Add(payment);
        }

        Booking? booking = null;
        if (!string.IsNullOrWhiteSpace(bookingRef))
        {
            booking = await db.Bookings
                .OrderByDescending(b => b.Id)
                .FirstOrDefaultAsync(b =>
                    b.ReferenceNumber == bookingRef || b.PackageName == bookingRef);
        }

        payment.BookingId = booking?.Id;
        payment.CustomerName = booking?.CustomerName ?? string.Empty;
        payment.PackageName = booking?.PackageName ?? "Travel Package";
        payment.Amount = result.AmountPesos;
        payment.Method = "card";
        payment.Status = "Paid";
        payment.PaymentDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
        payment.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        if (booking is not null && !booking.Paid)
        {
            booking.Paid = true;
            booking.TransactionId = result.IntentId;
            booking.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        return result.IntentId;
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

        // Verify the webhook signature. Fail CLOSED: if no webhook secret is
        // configured, reject the event rather than silently trusting a forged
        // request. A valid "Paymongo-Signature" header is required either way.
        if (string.IsNullOrWhiteSpace(payMongoOptions.WebhookSecretKey))
        {
            return Unauthorized(new
            {
                success = false,
                message = "Webhook secret key is not configured on the server."
            });
        }

        if (string.IsNullOrWhiteSpace(signature) ||
            !payMongo.VerifyWebhookSignature(body, signature, timestamp))
        {
            return Unauthorized(new { success = false, message = "Invalid webhook signature." });
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
            string? sessionId = null;
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

                if (attributes.TryGetProperty("session", out var sess) && sess.ValueKind == JsonValueKind.Object &&
                    sess.TryGetProperty("id", out var sessId))
                    sessionId = sessId.GetString();

                if (attributes.TryGetProperty("checkout_session", out var cs) && cs.ValueKind == JsonValueKind.Object &&
                    cs.TryGetProperty("id", out var csId))
                    sessionId = csId.GetString();

                if (attributes.TryGetProperty("source", out var src) && src.ValueKind == JsonValueKind.Object &&
                    src.TryGetProperty("id", out var sid))
                    sourceId = sid.GetString();

                // Fallback for source events
                if (string.IsNullOrWhiteSpace(sourceId) && string.IsNullOrWhiteSpace(paymentId))
                    sourceId = attributes.TryGetProperty("id", out var rid) ? rid.GetString() : null;

                // Checkout Session events carry the session id as the resource id.
                if (type.StartsWith("checkout_session", StringComparison.OrdinalIgnoreCase))
                    sessionId = paymentId;
            }

            // Checkout Session events (Hosted Checkout page). We only upgrade:
            // a payment recorded as Paid must never be downgraded again.
            if (type.StartsWith("checkout_session", StringComparison.OrdinalIgnoreCase))
            {
                var statusKey = (status ?? string.Empty).ToLowerInvariant() is "paid"
                    ? "Paid"
                    : "Pending";

                Payment? payment = null;
                if (!string.IsNullOrWhiteSpace(sessionId))
                    payment = await db.Payments.FirstOrDefaultAsync(p => p.ReferenceId == sessionId);

                if (payment is not null && statusKey == "Paid" && payment.Status != "Paid")
                {
                    payment.Status = "Paid";
                    payment.PaymentDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
                    payment.UpdatedAt = DateTime.UtcNow;

                    if (payment.BookingId is int bookedId)
                    {
                        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == bookedId);
                        if (booking is not null)
                        {
                            booking.Paid = true;
                            booking.TransactionId = sessionId ?? booking.TransactionId;
                            booking.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                    await db.SaveChangesAsync();
                }

                return Ok(new { success = true, received = true, type, status = statusKey });
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
                    if (statusKey != "Paid" && payment.Status == "Paid")
                    {
                        // Never downgrade an already-processed payment.
                        return Ok(new { success = true, received = true, type, status = "Paid" });
                    }

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