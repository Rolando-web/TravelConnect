# Section 10 — Promotions Management Screen

> **Figure 10 — Promotions Management (`/admin/promotions`)**

---

## Screenshot Description

The Promotions screen manages discount codes:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  Header: TravelConnect / Promotions    │  Admin ▼  │
│           │─────────────────────────────────────────────────────│
│ Dashboard │  ┌────────┐ ┌──────────┐ ┌──────────────────┐     │
│ Users     │  │ Total  │ │  Active  │ │ Discount Given   │     │
│ Customers │  │    6   │ │     4    │ │     ₱12,500      │     │
│ Suppliers │  └────────┘ └──────────┘ └──────────────────┘     │
│ Packages  │                                                     │
│ Bookings  │  [All][Active][Expired][Inactive]                  │
│ Payments  │  [Percent][Flat]                [+ Add Promotion]  │
│ Leads     │─────────────────────────────────────────────────────│
│ Promotions│  Code     │ Campaign   │Discount│Usage    │Expires │
│ Reports   │  SUMMER26 │ Summer '26 │ 25%    │██░░ 2/8 │Dec 31  │
│ Profile   │  WELCOME  │ New User   │ ₱50    │████ 5/5 │Jan 15  │
│ Support   │  HONEYMOON│ Honeymoon  │ 10%    │█░░░ 1/10│Mar 31  │
│           │           │            │        │         │        │
│ Sign Out  │  ◄ 1 2 ... ►              Showing 1-10 of 6      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Primary File:** `client/TravelConnect.Client/src/pages/admin/PromotionsPage.jsx` (235 lines)

**Supporting Files:**
- `server/TravelConnect.Server/Controllers/PromotionsController.cs` — REST API
- `client/TravelConnect.Client/src/components/admin/CrudModal.jsx` — Create/Edit modal

---

## How to Take Screenshot

1. Navigate to `http://localhost:5173/admin/promotions`
2. Take screenshot showing stats cards, type filters, and promotions table with usage progress bars

---

## API Endpoints Used

| Endpoint | Method | Role in This Screen |
|----------|--------|-------------------|
| `GET /api/promotions` | GET | Fetches all promotion records |
| `GET /api/promotions/{id}` | GET | Fetches a single promotion |
| `GET /api/promotions/code/{code}` | GET | Validates a promo code during checkout (case-insensitive lookup) |
| `POST /api/promotions` | POST | Creates a new promotion |
| `PUT /api/promotions/{id}` | PUT | Updates a promotion |
| `DELETE /api/promotions/{id}` | DELETE | Removes a promotion record |

---

## Algorithms Used

### Promo Code Validation (Server-Side)
```csharp
var promo = await db.Promotions
    .FirstOrDefaultAsync(p => p.Code.ToLower() == code.ToLower());
```

### Discount Calculation (During Checkout)
```javascript
// Percent type
if (discountType === 'Percent') {
  discountAmount = totalAmount * discount / 100;
}
// Flat type
else if (discountType === 'Flat') {
  discountAmount = Math.min(totalAmount, discount);
}
```

### Usage Progress Bar
```javascript
const usagePercent = Math.min((usedCount / maxUses) * 100, 100);
// Color: green < 70%, yellow < 90%, red >= 90%
const barColor = usagePercent >= 90 ? 'bg-red-500' :
                 usagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
```

### Active Status Check
```javascript
const isActive = (promo) => {
  return promo.status === 'Active' &&
         new Date(promo.expiresAt) > new Date() &&
         promo.usedCount < promo.maxUses;
};
```

---

## Promotion Data Model

| Field | Type | Description |
|-------|------|-------------|
| Id | int | Primary key |
| Code | string | Unique code (e.g., SUMMER26) |
| CampaignName | string | Campaign display name |
| Description | string | Promotion details |
| Discount | decimal | Discount value |
| DiscountType | string | "Percent" or "Flat" |
| MaxUses | int | Maximum total uses |
| UsedCount | int | Current usage count |
| ExpiresAt | string | Expiration date |
| Status | string | Active / Inactive / Expired |
