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

    private static string BuildBookingConfirmationHtml(Booking booking, List<BookingFlight> flights)
    {
        var flightRows = string.Join("", flights.Select(f => $@"
            <tr>
                <td style='padding:12px;border-bottom:1px solid #e5e7eb;'>
                    <strong>{E(f.Airline)} {E(f.FlightNumber)}</strong><br/>
                    <span style='color:#6b7280;font-size:13px;'>{E(f.DepartureCity)} → {E(f.ArrivalCity)}</span>
                </td>
                <td style='padding:12px;border-bottom:1px solid #e5e7eb;'>{E(f.DepartureDate)}</td>
                <td style='padding:12px;border-bottom:1px solid #e5e7eb;'>{E(f.DepartureTime)} — {E(f.ArrivalTime)}</td>
                <td style='padding:12px;border-bottom:1px solid #e5e7eb;'>{E(f.Class)}</td>
                <td style='padding:12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#06D6A0;'>{E(f.SeatNumber)}</td>
            </tr>"));

        return $@"
        <!DOCTYPE html>
        <html><head><meta charset='utf-8'/></head>
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
                <table style='width:100%;border-collapse:collapse;margin-bottom:24px;'>
                    <thead><tr style='background:#f3f4f6;'>
                        <th style='padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;'>Flight</th>
                        <th style='padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;'>Date</th>
                        <th style='padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;'>Time</th>
                        <th style='padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;'>Class</th>
                        <th style='padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;'>Seat</th>
                    </tr></thead>
                    <tbody>{flightRows}</tbody>
                </table>" : "")}

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
