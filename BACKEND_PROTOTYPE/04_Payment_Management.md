# Section 04 — Payment Management Screen

> **Figure 4 — Payment Management (`/admin/payments`)**

---

## Screenshot Description

The Payment Management screen handles all payment operations and reconciliation:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  Header: TravelConnect / Payments     │  Admin ▼   │
│           │─────────────────────────────────────────────────────│
│ Dashboard │  ┌────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ │
│ Users     │  │ Total  │ │ Collected│ │ Pending │ │Refunded │ │
│ Customers │  │   89   │ │ ₱198,400 │ │ ₱12,500 │ │ ₱8,200  │
│ Suppliers │  └────────┘ └──────────┘ └─────────┘ └─────────┘ │
│ Packages  │                                                     │
│ Bookings  │  [Payments]  [Reconciliation]                      │
│ Payments  │─────────────────────────────────────────────────────│
│ Leads     │  ID │ Ref ID   │ Customer │ Amount │Method│Status  │
│ Promotions│  1  │ src_x.. │ Juan D.  │ ₱5,200 │GCash │ Paid   │
│ Reports   │  2  │ pay_x.. │ Maria S. │ ₱3,400 │Maya  │ Paid   │
│ Profile   │  3  │ src_y.. │ Pedro R. │ ₱8,900 │GCash │Pending │
│ Support   │     │          │          │        │      │[Refund]│
│           │  ◄ 1 2 ... ►              Showing 1-10 of 89      │
│ Sign Out  │                                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Primary File:** `client/TravelConnect.Client/src/pages/admin/PaymentsPage.jsx` (386 lines)

**Supporting Files:**
- `server/TravelConnect.Server/Controllers/PaymentsController.cs` — REST API (430 lines)
- `server/TravelConnect.Server/Services/PayMongoService.cs` — PayMongo integration (210 lines)
- `client/TravelConnect.Client/src/services/api.js` — API client

---

## How to Take Screenshot

1. Navigate to `http://localhost:5173/admin/payments`
2. Click "Payments" tab for the main payments table
3. Click "Reconciliation" tab for the reconciliation view
4. Take screenshot showing stats cards and table

---

## API Endpoints Used

| Endpoint | Method | Role in This Screen |
|----------|--------|-------------------|
| `GET /api/payments` | GET | Fetches all payments ordered by most recent update |
| `GET /api/payments/{id}` | GET | Fetches a single payment record |
| `POST /api/payments` | POST | Creates a new payment record |
| `PUT /api/payments/{id}` | PUT | Updates a payment record (status, method, etc.) |
| `DELETE /api/payments/{id}` | DELETE | Removes a payment record |
| `POST /api/payments/paymongo/checkout` | POST | Creates a PayMongo hosted Checkout Session for GCash/PayMaya. Validates minimum PHP 20, converts to centavos. Returns `sessionId` + `checkoutUrl` (checkout.paymongo.com) |
| `GET /api/payments/paymongo/checkout/{sessionId}` | GET | Polls the Checkout Session for outcome (paid/cancelled/failed/pending) |
| `POST /api/payments/paymongo/pay` | POST | Records the completed payment locally, links to matching booking, marks booking as paid |
| `POST /api/payments/paymongo/webhook` | POST | Receives PayMongo async events with HMAC-SHA256 verification |
| `GET /api/payments/reconciliation` | GET | Joins payments with bookings for match status. Filters: `?method=`, `?status=`, `?from=`, `?to=` |
| `POST /api/payments/{id}/refund-to-wallet` | POST | Marks payment as refunded, updates linked booking |

---

## Algorithms Used

### PayMongo Payment Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client   │────▶│  Server  │────▶│ PayMongo │────▶│  User    │
│  (React)  │     │  (.NET)  │     │   API    │     │ (E-Wallet)│
└────┬──────┘     └────┬──────┘     └────┬──────┘     └────┬─────┘
     │  1. Select      │                 │                  │
     │  GCash/PayMaya  │                 │                  │
     │────────────────▶│                 │                  │
     │                 │  2. Create      │                  │
     │                 │  Source         │                  │
     │                 │────────────────▶│                  │
     │                 │                 │  3. Redirect     │
     │  4. Get         │                 │  to e-wallet     │
     │  checkoutUrl    │◀────────────────│                  │
     │◀────────────────│                 │                  │
     │                 │                 │                  │
     │  5. Open popup  │                 │  6. User pays    │
     │  ──────────────────────────────────────────────────▶│
     │                 │                 │                  │
     │  7. Poll status │                 │                  │
     │  every 2.5s     │                 │                  │
     │────────────────▶│  8. Check source│                  │
     │                 │────────────────▶│                  │
     │                 │◀────────────────│                  │
     │  9. Status OK   │                 │                  │
     │◀────────────────│                 │                  │
     │                 │                 │                  │
     │ 10. Finalize    │ 11. Create      │                  │
     │ payment         │ payment         │                  │
     │────────────────▶│────────────────▶│                  │
     │                 │                 │                  │
     │                 │ 12. Link to     │                  │
     │                 │ booking         │                  │
     │                 │                 │                  │
```

**Step-by-step:**
1. Client creates source → server converts pesos to centavos (`pesos × 100`)
2. Returns `checkoutUrl` for popup window
3. Client polls source status every 2.5 seconds (timeout: 90s)
4. On "chargeable"/"paid"/"charged" status, finalizes via `/pay`
5. Server creates payment record, links to matching booking by reference + email

### Amount Conversion
```csharp
var amountCentavos = (long)Math.Round(amountPesos * 100);
// PHP 5,200.00 → 520000 centavos
```

### HMAC-SHA256 Webhook Verification

```csharp
public bool VerifyWebhookSignature(string payloadBody, string signature, string timestamp)
{
    var dataToSign = $"{timestamp}.{payloadBody}";
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_webhookSecretKey));
    var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dataToSign));
    var expected = Convert.ToHexString(hash);
    return FixedTimeEquals(expected, signature);  // Constant-time comparison
}
```

### Constant-Time Comparison (Timing Attack Prevention)
```csharp
private static bool FixedTimeEquals(string a, string b)
{
    if (a.Length != b.Length) return false;
    var result = 0;
    for (var i = 0; i < a.Length; i++)
        result |= a[i] ^ b[i];  // XOR comparison — same time regardless of match
    return result == 0;
}
```

### Payment Reconciliation
Cross-references Payment records with Booking records:
```csharp
var reconciliation = from p in db.Payments
                     join b in db.Bookings on p.BookingId equals b.Id into gj
                     from b in gj.DefaultIfEmpty()
                     select new {
                         Payment = p,
                         Booking = b,
                         Status = b == null ? "Unmatched" :
                                  p.Amount == b.TotalAmount ? "Matched" : "Mismatched"
                     };
```

---

## Payment Status Flow

```
Created (Pending) → Paid → Refunded
                   → Failed
```

| Status | Badge Color | Description |
|--------|------------|-------------|
| Pending | Amber | Source created, awaiting payment |
| Paid | Green | Payment completed successfully |
| Refunded | Red | Refund processed to wallet |
| Failed | Red | Payment failed or expired |

---

## Supported Payment Methods

| Method | API Code | Description |
|--------|----------|-------------|
| GCash | `gcash` | Philippine e-wallet via PayMongo |
| PayMaya | `paymaya` | Philippine e-wallet via PayMongo |
| Wallet | `wallet` | Internal wallet balance refund |
