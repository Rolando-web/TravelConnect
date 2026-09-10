# Section 03 — Booking Management Screen

> **Figure 3 — Booking Management (`/admin/bookings`)**

---

## Screenshot Description

The Booking Management screen provides full CRUD operations for travel bookings:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  Header: TravelConnect / Bookings      │  Admin ▼  │
│           │─────────────────────────────────────────────────────│
│ Dashboard │  ┌────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ │
│ Users     │  │ Total  │ │ Upcoming │ │Completed│ │Cancelled│ │
│ Customers │  │  156   │ │    45    │ │   89    │ │   22    │ │
│ Suppliers │  └────────┘ └──────────┘ └─────────┘ └─────────┘ │
│ Packages  │                                                     │
│ Bookings  │  [All] [Upcoming] [Completed] [Cancelled] [Refund]│
│ Payments  │  🔍 Search by name or reference...    [+ Add New]  │
│ Leads     │─────────────────────────────────────────────────────│
│ Promotions│  Ref#  │ Customer │ Package   │ Dates  │Amt │Status│
│ Reports   │  TC..  │ Juan D.  │ Boracay   │ Sep 15 │5,200│ Up  │
│ Profile   │  TC..  │ Maria S. │ Tokyo     │ Sep 20 │8,900│ Cmp │
│ Support   │  TC..  │ Pedro R. │ Palawan   │ Oct 01 │3,400│ Can │
│           │        │          │           │        │     │     │
│ Sign Out  │  ◄ 1 2 3 ... 10 ►           Showing 1-10 of 156  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Primary File:** `client/TravelConnect.Client/src/pages/admin/BookingsPage.jsx` (361 lines)

**Supporting Files:**
- `client/TravelConnect.Client/src/components/admin/AdminTable.jsx` — Reusable CRUD table
- `client/TravelConnect.Client/src/components/admin/CrudModal.jsx` — Create/Edit modal
- `client/TravelConnect.Client/src/context/BookingContext.jsx` — Booking state management
- `server/TravelConnect.Server/Controllers/BookingsController.cs` — REST API (285 lines)
- `server/TravelConnect.Server/Services/CancellationService.cs` — Refund algorithm

---

## How to Take Screenshot

1. Navigate to `http://localhost:5173/admin/bookings`
2. Ensure bookings exist in the database (seed data includes sample bookings)
3. Take screenshot showing the stats cards, filter buttons, and table

---

## API Endpoints Used

| Endpoint | Method | Role in This Screen |
|----------|--------|-------------------|
| `GET /api/bookings` | GET | Fetches all bookings. Supports `?status=` and `?customer=` query filters. Includes BookingFlights sorted by SegmentOrder |
| `GET /api/bookings/{id}` | GET | Fetches a single booking with all flight segments (for detail modal) |
| `POST /api/bookings` | POST | Creates a new booking with up to 6 flight segments. Auto-links pending PayMongo payments |
| `PUT /api/bookings/{id}` | PUT | Updates booking fields (admin edits) |
| `DELETE /api/bookings/{id}` | DELETE | Removes a booking record |
| `GET /api/bookings/{id}/refund-preview` | GET | Previews refund amount based on cancellation policy tier without cancelling |
| `POST /api/bookings/{id}/cancel` | POST | Cancels booking: calculates refund, releases seats, generates refund reference, sends email |
| `PUT /api/seatmaps/admin-override` | PUT | Admin force-reassigns a seat to a different seat number |

---

## Algorithms Used

### Cancellation & Refund Algorithm (`CancellationService.cs`)

A time-based tiered refund policy:

```
Days Since Booking    Policy Tier    Refund %    Behavior
─────────────────────────────────────────────────────────
0–7 days              "full"         100%        Full cash refund
8–14 days             "partial"      50%         Partial refund or travel credit
15+ days              "credit"       0%          Travel credit only, no cash
```

**Formula:**
```
refundAmount = round(TotalAmount × refundPercentage / 100, 2)
```

**Cancellation Flow:**
1. Calculate refund using tier system
2. Release all reserved/sold seats back to "Available"
3. Generate unique refund reference: `RFND-{year}-{6-digit random}`
4. Send cancellation email asynchronously (background `Task.Run`)
5. Update booking status to "refunded"

### Booking-to-Payment Linking

During booking creation, the server automatically searches for pending payments:
```csharp
var pending = await db.Payments
    .Where(p => p.BookingId == null &&
                p.CustomerName == booking.CustomerName &&
                p.PackageName == reference)
    .OrderByDescending(p => p.Id)
    .FirstOrDefaultAsync();
```
If found, the payment is linked to the booking and the booking is marked as paid.

### Reference Number Generation

Format: `TC-{year}-{4-digit}` (e.g., `TC-2026-0001`)

---

## Booking Status Flow

```
Created → Upcoming → Completed
                    → Cancelled → Refunded
```

| Status | Color Badge | Description |
|--------|------------|-------------|
| Upcoming | Cyan | Future travel date, not yet traveled |
| Completed | Green | Travel date passed, trip completed |
| Cancelled | Red | Cancelled by customer or admin |
| Refunded | Red | Cancelled + refund processed |

---

## Booking Data Model

| Field | Type | Description |
|-------|------|-------------|
| ReferenceNumber | string | Unique booking reference (e.g., TC-2026-0001) |
| CustomerName | string | Booked by |
| CustomerEmail | string | Contact email |
| CustomerPhone | string | Contact phone |
| PackageId | int | FK to Packages |
| PackageName | string | Snapshot at booking time |
| Location | string | Destination |
| StartDate / EndDate | string | Travel dates |
| Travellers | int | Number of travelers |
| Subtotal | decimal | Before discounts |
| DiscountAmount | decimal | Promo discount |
| TotalAmount | decimal | Final price |
| Status | string | upcoming / completed / cancelled / refunded |
| Paid | bool | Payment status |
| PaymentMethod | string | gcash / paymaya / wallet |
| SeatNumbers | string | Comma-separated seat numbers |
| CancellationPolicyTier | string | full / partial / credit |
| RefundAmount | decimal | Calculated refund |
| RefundReference | string | e.g., RFND-2026-123456 |
| BookingFlights | List | Up to 6 flight segments |
