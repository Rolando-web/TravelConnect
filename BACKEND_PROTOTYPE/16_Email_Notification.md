# Section 16 — Email Notification System

> **Figure 16 — Email Notification Flow & Templates**

---

## Screenshot Description

Email templates rendered as HTML:

### Booking Confirmation Email
```
┌─────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  ✈️  Booking Confirmed!                                   ║  │
│  ║      Your trip is all set                                  ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│                                                                 │
│  BOOKING REFERENCE                                              │
│  ┌──────────────────────────────────────────┐                  │
│  │     TC-2026-0001                          │                  │
│  └──────────────────────────────────────────┘                  │
│                                                                 │
│  PASSENGER DETAILS                                              │
│  Name:       Juan Dela Cruz                                     │
│  Email:      juan@email.com                                     │
│  Phone:      +63 917 123 4567                                  │
│  Travellers: 2                                                  │
│                                                                 │
│  FLIGHT ITINERARY                                               │
│  ┌──────────────┬──────────┬──────────┬─────────┬──────┐      │
│  │ Flight       │ Date     │ Time     │ Class   │ Seat │      │
│  ├──────────────┼──────────┼──────────┼─────────┼──────┤      │
│  │ PR 102       │ Sep 15   │ 07:00-09 │ Economy │ 12A  │      │
│  │ 5J 201       │ Sep 20   │ 14:00-16 │ Economy │ 8B   │      │
│  └──────────────┴──────────┴──────────┴─────────┴──────┘      │
│                                                                 │
│  Package:    Boracay Beach Getaway                             │
│  Location:   Boracay, Philippines                              │
│  Dates:      Sep 15 — Sep 18, 2026                             │
│  Payment:    gcash                                              │
│  TOTAL PAID: ₱5,200.00                                         │
│                                                                 │
│  TERMS & CONDITIONS                                             │
│  • Present this e-ticket at check-in                           │
│  • Seat assignments subject to availability                    │
│  • Cancellation policy: Full refund within 7 days              │
│  • This ticket is non-transferable                             │
│                                                                 │
│  TravelConnect — Your Journey Starts Here                       │
└─────────────────────────────────────────────────────────────────┘
```

### Cancellation Email
```
┌─────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  Booking Cancelled                                         ║  │
│  ║      Refund: 100% Full Refund                             ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│                                                                 │
│  BOOKING REFERENCE                                              │
│  ┌──────────────────────────────────────────┐                  │
│  │     TC-2026-0001                          │                  │
│  └──────────────────────────────────────────┘                  │
│                                                                 │
│  Package:         Boracay Beach Getaway                        │
│  Original Amount: ₱5,200.00                                    │
│  Refund Amount:   ₱5,200.00                                    │
│  Refund Reference: RFND-2026-123456                            │
│  Policy Tier:     100% Full Refund                             │
│                                                                 │
│  TravelConnect — Your Journey Starts Here                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Primary File:** `server/TravelConnect.Server/Services/EmailService.cs` (215 lines)

**Triggered From:**
- `server/TravelConnect.Server/Controllers/BookingsController.cs` — `POST /api/bookings/{id}/send-confirmation`
- `server/TravelConnect.Server/Controllers/BookingsController.cs` — `POST /api/bookings/{id}/cancel`

---

## How to Take Screenshot

1. Trigger a booking confirmation: `POST /api/bookings/{id}/send-confirmation`
2. Check the recipient email inbox
3. Screenshot the received HTML email
4. Repeat for cancellation email

---

## API Endpoints Used

| Endpoint | Method | Role |
|----------|--------|------|
| `POST /api/bookings/{id}/send-confirmation` | POST | Triggers booking confirmation email via SMTP |
| `POST /api/bookings/{id}/cancel` | POST | Triggers cancellation email in background (`Task.Run`) |

---

## Algorithms Used

### Background Email Dispatch
Cancellation emails are sent asynchronously to avoid blocking the HTTP response:
```csharp
// Send cancellation email in background
_ = Task.Run(async () =>
{
    try
    {
        using var scope = HttpContext.RequestServices.CreateScope();
        var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();
        await emailService.SendCancellationEmailAsync(booking, refund.RefundAmount, refundRef, refund.PolicyTier);
    }
    catch { }
});
```

### Email Logging
All sent/failed emails are logged to the `EmailLogs` table:
```csharp
private async Task LogEmailAsync(int? bookingId, string recipient, string subject,
    string type, string status, string error = "")
{
    db.EmailLogs.Add(new EmailLog
    {
        BookingId = bookingId,
        RecipientEmail = recipient,
        Subject = subject,
        Type = type,         // "booking_confirmation" or "cancellation"
        Status = status,     // "Sent" or "Failed"
        ErrorMessage = error,
        SentAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();
}
```

### HTML Template Generation
Dynamic HTML email templates built with inline CSS for maximum email client compatibility:
```csharp
private static string BuildBookingConfirmationHtml(Booking booking, List<BookingFlight> flights)
{
    return $@"
    <!DOCTYPE html>
    <html>
    <body style='font-family:Segoe UI,Arial,sans-serif;background:#f9fafb;'>
    <div style='max-width:600px;margin:0 auto;background:#fff;border-radius:12px;'>
        <div style='background:linear-gradient(135deg,#06D6A0,#118AB2);padding:32px;'>
            <h1 style='color:#fff;'>✈ Booking Confirmed!</h1>
        </div>
        <!-- Dynamic content with booking data -->
    </div>
    </body></html>";
}
```

---

## Email Configuration

| Setting | Default Value | Source |
|---------|--------------|--------|
| SMTP Host | `smtp.gmail.com` | `EmailOptions.Host` |
| SMTP Port | `587` | `EmailOptions.Port` |
| From Name | `TravelConnect` | `EmailOptions.FromName` |
| Security | STARTTLS | `SecureSocketOptions.StartTls` |
| Auth | App Password | `EmailOptions.Username` + `Password` |

---

## Email Log Data Model

| Field | Type | Description |
|-------|------|-------------|
| Id | int | Primary key |
| BookingId | int? | FK to Bookings (nullable) |
| RecipientEmail | string | To address |
| Subject | string | Email subject |
| Type | string | booking_confirmation / cancellation / refund |
| Status | string | Sent / Failed / Pending |
| ErrorMessage | string | Error details if failed |
| SentAt | DateTime | Timestamp |
