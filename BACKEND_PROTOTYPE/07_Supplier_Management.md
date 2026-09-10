# Section 07 — Supplier Management Screen

> **Figure 7 — Supplier Management (`/admin/suppliers`)**

---

## Screenshot Description

The Supplier Management screen manages service providers:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  Header: TravelConnect / Suppliers    │  Admin ▼   │
│           │─────────────────────────────────────────────────────│
│ Dashboard │  ┌────────┐ ┌──────────┐ ┌──────────────────┐     │
│ Users     │  │ Total  │ │  Active  │ │ Average Rating   │     │
│ Customers │  │    6   │ │     5    │ │     ★ 4.6        │     │
│ Suppliers │  └────────┘ └──────────┘ └──────────────────┘     │
│ Packages  │                                                     │
│ Bookings  │  [All] [Active] [Review]          [Export CSV]     │
│ Payments  │  🔍 Search...                     [+ Add Supplier] │
│ Leads     │─────────────────────────────────────────────────────│
│ Promotions│  ID │ Company      │ Type     │ Contact │Rating│Act│
│ Reports   │  1  │ White Beach  │ Hotel    │ John B. │ ★4.8 │ • │
│ Profile   │  2  │ Sakura Travel│ Tour Op. │ Yuki T. │ ★4.5 │ • │
│ Support   │  3  │ Nusa Hosp.   │ Hotel    │ Wayan R.│ ★4.3 │ • │
│           │     │              │          │         │      │   │
│ Sign Out  │  ◄ 1 2 ... ►              Showing 1-10 of 6      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Primary File:** `client/TravelConnect.Client/src/pages/admin/SuppliersPage.jsx` (418 lines)

**Supporting Files:**
- `server/TravelConnect.Server/Controllers/SuppliersController.cs` — REST API
- `client/TravelConnect.Client/src/components/admin/CrudModal.jsx` — Create/Edit/View modal

---

## How to Take Screenshot

1. Navigate to `http://localhost:5173/admin/suppliers`
2. Take screenshot showing stats cards and supplier table
3. Click "View" on a row to show the detail modal

---

## API Endpoints Used

| Endpoint | Method | Role in This Screen |
|----------|--------|-------------------|
| `GET /api/suppliers` | GET | Fetches all supplier records |
| `GET /api/suppliers/{id}` | GET | Fetches a single supplier |
| `POST /api/suppliers` | POST | Creates a new supplier |
| `PUT /api/suppliers/{id}` | PUT | Updates supplier details |
| `DELETE /api/suppliers/{id}` | DELETE | Removes a supplier record |
| `GET /api/packages` | GET | Fetches packages to compute average price per supplier (client-side join) |

---

## Algorithms Used

### Average Price per Supplier (Client-Side Join)
```javascript
// When viewing supplier detail
const supplierPackages = packages.filter(p => p.supplierId === supplier.id);
const avgPrice = supplierPackages.length > 0
  ? supplierPackages.reduce((sum, p) => sum + p.price, 0) / supplierPackages.length
  : 0;
```

### Average Rating Calculation
```javascript
const avgRating = suppliers.length > 0
  ? (suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length).toFixed(1)
  : '0.0';
```

### Active Supplier Count
```javascript
const activeCount = suppliers.filter(s => s.status === 'Active').length;
```

---

## Supplier Data Model

| Field | Type | Description |
|-------|------|-------------|
| Id | int | Primary key |
| CompanyName | string | Business name |
| ContactName | string | Primary contact person |
| ContactEmail | string | Contact email |
| ContactPhone | string | Contact phone |
| Type | string | "Hotel" or "Tour Op." |
| Rating | decimal | Average rating (1.0–5.0) |
| Status | string | Active / Review |
| FirebaseUid | string | Linked Firebase Auth UID |
| ImageUrl | string | Company logo image |
