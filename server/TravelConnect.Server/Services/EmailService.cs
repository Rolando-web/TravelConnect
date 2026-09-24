using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Options;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Services;

public class EmailOptions
{
    public string Host { get; set; } = "smtp.gmail.com";
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "TravelConnect";
}

public record EmailSendResult(bool Sent, string? Error = null);

public class EmailService
{
    private readonly EmailOptions _options;
    private readonly IServiceProvider _sp;

    public EmailService(IOptions<EmailOptions> options, IServiceProvider sp)
    {
        _options = options.Value;
        _sp = sp;
    }

    public async Task SendBookingConfirmationAsync(Booking booking, List<BookingFlight> flights)
    {
        if (string.IsNullOrWhiteSpace(_options.Username) || string.IsNullOrWhiteSpace(_options.Password))
            return; // SMTP not configured, skip silently

        try
        {
            var subject = $"Booking Confirmed — {booking.ReferenceNumber} | TravelConnect";
            var htmlBody = BuildBookingConfirmationHtml(booking, flights);

            await SendEmailAsync(booking.CustomerEmail, subject, htmlBody);
            await LogEmailAsync(booking.Id, booking.CustomerEmail, subject, "booking_confirmation", "Sent");
        }
        catch (Exception ex)
        {
            await LogEmailAsync(booking.Id, booking.CustomerEmail, "Booking Confirmation", "booking_confirmation", "Failed", ex.Message);
        }
    }

    public async Task SendCancellationEmailAsync(Booking booking, decimal refundAmount, string refundReference, string policyTier)
    {
        if (string.IsNullOrWhiteSpace(_options.Username))
            return;

        try
        {
            var subject = $"Booking Cancelled — {booking.ReferenceNumber} | TravelConnect";
            var htmlBody = BuildCancellationHtml(booking, refundAmount, refundReference, policyTier);

            await SendEmailAsync(booking.CustomerEmail, subject, htmlBody);
            await LogEmailAsync(booking.Id, booking.CustomerEmail, subject, "cancellation", "Sent");
        }
        catch (Exception ex)
        {
            await LogEmailAsync(booking.Id, booking.CustomerEmail, "Cancellation Notice", "cancellation", "Failed", ex.Message);
        }
    }

    /// <summary>
    /// Sends a direct email reply for an inquiry (e.g. a subscription tier
    /// inquiry) and records it in the email history. Requires the SMTP
    /// EmailOptions to be configured; returns false if not available.
    /// </summary>
    public async Task<bool> SendInquiryReplyAsync(string to, string toName, string subject, string body)
    {
        if (string.IsNullOrWhiteSpace(_options.Username) || string.IsNullOrWhiteSpace(_options.Password))
            return false;

        try
        {
            var htmlBody = BuildInquiryReplyHtml(toName, body);
            await SendEmailAsync(to, subject, htmlBody);
            await LogEmailAsync(null, to, subject, "subscription_inquiry_reply", "Sent");
            return true;
        }
        catch (Exception ex)
        {
            await LogEmailAsync(null, to, subject, "subscription_inquiry_reply", "Failed", ex.Message);
            return false;
        }
    }

    /// <summary>
    /// Fallback notification for a new tier/subscription inquiry when EmailJS
    /// refuses the call (by default EmailJS blocks non-browser callers with
    /// 403 until "Allow EmailJS API for non-browser applications" is enabled
    /// in Account → Security). Emails the system owner so no inquiry slips by
    /// unnoticed. Does not write an EmailLog — the caller owns that so the
    /// record reflects whichever provider actually delivered it.
    /// </summary>
    public async Task<EmailSendResult> SendSubscriptionInquiryNoticeAsync(
        string name, string email, string time, string message,
        string tier, string planName)
    {
        if (string.IsNullOrWhiteSpace(_options.Username) || string.IsNullOrWhiteSpace(_options.Password))
            return new EmailSendResult(false, "SMTP is not configured");

        var recipient = string.IsNullOrWhiteSpace(_options.FromAddress)
            ? _options.Username
            : _options.FromAddress;

        try
        {
            var subject = $"{Clean(tier)} — {Clean(planName)} subscription inquiry";
            var htmlBody = BuildSubscriptionInquiryNoticeHtml(name, email, time, message, tier, planName);
            await SendEmailAsync(recipient, subject, htmlBody);
            return new EmailSendResult(true);
        }
        catch (Exception ex)
        {
            return new EmailSendResult(false, ex.Message);
        }
    }

    // Keeps tier/plan labels safe inside email subjects.
    private static string Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "TravelConnect" : value.Trim();

    private static string BuildSubscriptionInquiryNoticeHtml(
        string name, string email, string time, string message,
        string tier, string planName)
    {
        var detailRow = (string label, string value) =>
            $"<tr><td style='padding:8px 0;color:#6b7280;font-weight:600;'>{E(label)}</td>" +
            $"<td style='padding:8px 0;text-align:right;'>{E(value)}</td></tr>";

        return $@"
        <!DOCTYPE html>
        <html><head><meta charset='utf-8'/></head>
        <body style='font-family:Segoe UI,Arial,sans-serif;background:#f9fafb;margin:0;padding:24px;'>
        <div style='max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);'>
            <div style='background:linear-gradient(135deg,#008fe5,#06D6A0);padding:28px;text-align:center;'>
                <h1 style='color:#fff;margin:0;font-size:22px;'>New Subscription Inquiry</h1>
                <p style='color:rgba(255,255,255,0.9);margin:6px 0 0;'>Agencies reaching out to TravelConnect</p>
            </div>
            <div style='padding:32px;'>
                <p style='margin:0 0 16px;color:#374151;'><strong>{E(name)}</strong> ({E(email)}) wants to avail a plan.</p>
                <table style='width:100%;margin-bottom:24px;'>
                    {detailRow("Time", time)}
                    {detailRow("Tier", tier)}
                    {detailRow("Plan", planName)}
                </table>
                <p style='margin:0 0 8px;color:#374151;font-weight:600;'>Message</p>
                <div style='background:#f8fafc;border-radius:8px;padding:16px;color:#374151;line-height:1.6;'>
                    {E(message)}
                </div>
                <p style='margin:20px 0 0;color:#9ca3af;font-size:13px;'>
                    Reply through the admin Subscription inbox or the Support Hub.
                </p>
            </div>
            <div style='background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px;'>
                TravelConnect — Your Journey Starts Here
            </div>
        </div>
        </body></html>";
    }

    private static string BuildInquiryReplyHtml(string toName, string body)
    {
        var greeting = string.IsNullOrWhiteSpace(toName) ? "there" : E(toName);
        var paragraphs = string.Join("", (body ?? string.Empty)
            .Split('\n', StringSplitOptions.RemoveEmptyEntries)
            .Select(p => $"<p style='margin:0 0 12px;line-height:1.6;'>{E(p.Trim())}</p>"));

        return $@"
        <!DOCTYPE html>
        <html><head><meta charset='utf-8'/></head>
        <body style='font-family:Segoe UI,Arial,sans-serif;background:#f9fafb;margin:0;padding:24px;'>
        <div style='max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);'>
            <div style='background:linear-gradient(135deg,#008fe5,#06D6A0);padding:28px;text-align:center;'>
                <h1 style='color:#fff;margin:0;font-size:22px;'>TravelConnect Support</h1>
                <p style='color:rgba(255,255,255,0.9);margin:6px 0 0;'>Reply from our team</p>
            </div>
            <div style='padding:32px;'>
                <p style='margin:0 0 16px;color:#374151;'>Hi <strong>{greeting}</strong>,</p>
                {paragraphs}
                <p style='margin:20px 0 0;color:#9ca3af;font-size:13px;'>
                    If you have any other questions, just reply to this email or use the chat bubble on the site.
                </p>
            </div>
            <div style='background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px;'>
                TravelConnect — Your Journey Starts Here
            </div>
        </div>
        </body></html>";
    }

    private async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;

        var bodyBuilder = new BodyBuilder { HtmlBody = htmlBody };
        message.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(_options.Host, _options.Port, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(_options.Username, _options.Password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    private async Task LogEmailAsync(int? bookingId, string recipient, string subject, string type, string status, string error = "")
    {
        try
        {
            using var scope = _sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<TravelConnectDbContext>();
            db.EmailLogs.Add(new EmailLog
            {
                BookingId = bookingId,
                RecipientEmail = recipient,
                Subject = subject,
                Type = type,
                Status = status,
                ErrorMessage = error,
                SentAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
        catch { /* logging failure should not break email flow */ }
    }

    // HTML-encode user-controlled values so email templates cannot be abused
    // for HTML/script injection via booking data.
    private static string E(string? value) =>
        string.IsNullOrEmpty(value) ? string.Empty : System.Net.WebUtility.HtmlEncode(value);

    // Render each assigned seat as its own badge so a multi-traveller booking
    // shows one seat per guest (e.g. "12A" "12B" instead of a single "12A,12B").
    private static string BuildSeatBadges(string? seatNumber)
    {
        if (string.IsNullOrWhiteSpace(seatNumber)) return "—";

        var seats = seatNumber
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim())
            .Where(s => s.Length > 0)
            .ToList();

        if (seats.Count == 0) return "—";

        return string.Join("<br/>", seats.Select(s =>
            $"<span style='display:inline-block;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:4px;padding:2px 8px;margin:2px 2px 2px 0;font-size:12px;'>{E(s)}</span>"));
    }

    internal static string BuildBookingConfirmationHtml(Booking booking, List<BookingFlight> flights)
    {
        // Each flight renders as its own stacked card (label + value rows) so the
        // Seat number stays fully visible on narrow phone screens — a single
        // 5-column table gets clipped and hides the right-most (Seat) column.
        var flightCards = string.Join("", flights.Select(f => $@"
            <div style='background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-bottom:12px;'>
                <div style='font-weight:700;color:#0f172a;font-size:14px;margin-bottom:8px;'>
                    ✈ {E(f.Airline)} {E(f.FlightNumber)}
                </div>
                <table style='width:100%;border-collapse:collapse;'>
                    <tr>
                        <td style='padding:4px 0;color:#6b7280;font-size:13px;width:35%;'>Route</td>
                        <td style='padding:4px 0;font-weight:600;font-size:13px;'>{E(f.DepartureCity)} → {E(f.ArrivalCity)}</td>
                    </tr>
                    <tr>
                        <td style='padding:4px 0;color:#6b7280;font-size:13px;'>Date</td>
                        <td style='padding:4px 0;font-weight:600;font-size:13px;'>{E(f.DepartureDate)}</td>
                    </tr>
                    <tr>
                        <td style='padding:4px 0;color:#6b7280;font-size:13px;'>Time</td>
                        <td style='padding:4px 0;font-weight:600;font-size:13px;'>{E(f.DepartureTime)} — {E(f.ArrivalTime)}</td>
                    </tr>
                    <tr>
                        <td style='padding:4px 0;color:#6b7280;font-size:13px;'>Class</td>
                        <td style='padding:4px 0;font-weight:600;font-size:13px;'>{E(f.Class)}</td>
                    </tr>
                    <tr>
                        <td style='padding:6px 0 2px;color:#6b7280;font-size:13px;'>Seat</td>
                        <td style='padding:6px 0 2px;'>{BuildSeatBadges(f.SeatNumber)}</td>
                    </tr>
                </table>
            </div>"));

        return $@"
        <!DOCTYPE html>
        <html><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/></head>
        <body style='font-family:Segoe UI,Arial,sans-serif;background:#f9fafb;margin:0;padding:24px;'>
        <div style='max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);'>
            <div style='background:linear-gradient(135deg,#06D6A0,#118AB2);padding:32px;text-align:center;'>
                <h1 style='color:#fff;margin:0;font-size:24px;'>✈ Booking Confirmed!</h1>
                <p style='color:rgba(255,255,255,0.9);margin:8px 0 0;'>Your trip is all set</p>
            </div>
            <div style='padding:32px;'>
                <div style='background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;'>
                    <p style='margin:0;color:#166534;font-size:13px;'>BOOKING REFERENCE</p>
                    <p style='margin:4px 0 0;font-size:28px;font-weight:700;color:#15803d;letter-spacing:2px;'>{E(booking.ReferenceNumber)}</p>
                </div>
                <h2 style='color:#1f2937;font-size:18px;margin:0 0 8px;'>Passenger Details</h2>
                <table style='width:100%;margin-bottom:24px;'><tr>
                    <td style='padding:8px 0;color:#6b7280;'>Name</td><td style='padding:8px 0;font-weight:600;'>{E(booking.CustomerName)}</td>
                </tr><tr>
                    <td style='padding:8px 0;color:#6b7280;'>Email</td><td style='padding:8px 0;'>{E(booking.CustomerEmail)}</td>
                </tr><tr>
                    <td style='padding:8px 0;color:#6b7280;'>Phone</td><td style='padding:8px 0;'>{E(booking.CustomerPhone)}</td>
                </tr><tr>
                    <td style='padding:8px 0;color:#6b7280;'>Travellers</td><td style='padding:8px 0;'>{E(booking.Travellers.ToString())}</td>
                </tr></table>

                {(flights.Count > 0 ? $@"
                <h2 style='color:#1f2937;font-size:18px;margin:0 0 8px;'>Flight Itinerary</h2>
                {flightCards}" : "")}

                <div style='background:#f8fafc;border-radius:8px;padding:16px;'>
                    <table style='width:100%;'>
                        <tr><td style='padding:4px 0;color:#6b7280;'>Package</td><td style='padding:4px 0;text-align:right;font-weight:600;'>{E(booking.PackageName)}</td></tr>
                        <tr><td style='padding:4px 0;color:#6b7280;'>Location</td><td style='padding:4px 0;text-align:right;'>{E(booking.Location)}</td></tr>
                        <tr><td style='padding:4px 0;color:#6b7280;'>Travel Dates</td><td style='padding:4px 0;text-align:right;'>{E(booking.StartDate)} — {E(booking.EndDate)}</td></tr>
                        <tr><td style='padding:4px 0;color:#6b7280;'>Payment</td><td style='padding:4px 0;text-align:right;'>{E(booking.PaymentMethod)}</td></tr>
                        <tr><td style='padding:4px 0;color:#6b7280;font-weight:700;font-size:16px;'>Total Paid</td><td style='padding:4px 0;text-align:right;font-weight:700;font-size:16px;color:#06D6A0;'>₱{booking.TotalAmount:N2}</td></tr>
                    </table>
                </div>
            </div>
            <div style='background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px;'>
                TravelConnect — Your Journey Starts Here
            </div>
        </div>
        </body></html>";
    }

    private static string BuildCancellationHtml(Booking booking, decimal refundAmount, string refundReference, string policyTier)
    {
        var tierLabel = policyTier switch
        {
            "full" => "100% Full Refund",
            "partial" => "Partial Refund",
            "credit" => "Travel Credit",
            _ => "Refund"
        };

        return $@"
        <!DOCTYPE html>
        <html><head><meta charset='utf-8'/></head>
        <body style='font-family:Segoe UI,Arial,sans-serif;background:#f9fafb;margin:0;padding:24px;'>
        <div style='max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);'>
            <div style='background:linear-gradient(135deg,#ef4444,#f97316);padding:32px;text-align:center;'>
                <h1 style='color:#fff;margin:0;font-size:24px;'>Booking Cancelled</h1>
                <p style='color:rgba(255,255,255,0.9);margin:8px 0 0;'>Refund {tierLabel}</p>
            </div>
            <div style='padding:32px;'>
                <div style='background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;'>
                    <p style='margin:0;color:#991b1b;font-size:13px;'>BOOKING REFERENCE</p>
                    <p style='margin:4px 0 0;font-size:24px;font-weight:700;color:#dc2626;'>{E(booking.ReferenceNumber)}</p>
                </div>
                <table style='width:100%;margin-bottom:24px;'>
                    <tr><td style='padding:8px 0;color:#6b7280;'>Package</td><td style='padding:8px 0;text-align:right;font-weight:600;'>{E(booking.PackageName)}</td></tr>
                    <tr><td style='padding:8px 0;color:#6b7280;'>Original Amount</td><td style='padding:8px 0;text-align:right;'>₱{booking.TotalAmount:N2}</td></tr>
                    <tr><td style='padding:8px 0;color:#6b7280;font-weight:700;'>Refund Amount</td><td style='padding:8px 0;text-align:right;font-weight:700;color:#06D6A0;'>₱{refundAmount:N2}</td></tr>
                    <tr><td style='padding:8px 0;color:#6b7280;'>Refund Reference</td><td style='padding:8px 0;text-align:right;font-weight:600;'>{E(refundReference)}</td></tr>
                    <tr><td style='padding:8px 0;color:#6b7280;'>Policy Tier</td><td style='padding:8px 0;text-align:right;'>{tierLabel}</td></tr>
                </table>
            </div>
            <div style='background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px;'>
                TravelConnect — Your Journey Starts Here
            </div>
        </div>
        </body></html>";
    }
}
