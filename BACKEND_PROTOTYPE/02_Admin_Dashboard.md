# Section 02 — Admin Dashboard Screen

> **Figure 2 — Admin Dashboard (`/admin/dashboard`)**

---

## Screenshot Description

The Admin Dashboard is the landing page after login. It displays:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  Header: TravelConnect / Dashboard     │  Admin ▼  │
│           │─────────────────────────────────────────────────────│
│ Dashboard │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ │
│ Users     │  │ Bookings │ │ Revenue  │ │ Packages│ │ Flights │ │
│ Customers │  │   156    │ │ ₱245,800 │ │   18    │ │   12    │ │
│ Suppliers │  └─────────┘ └──────────┘ └─────────┘ └─────────┘ │
│ Packages  │                                                     │
│ Bookings  │  ┌──────────────────┐  ┌──────────────────────┐   │
│ Payments  │  │  Bookings by     │  │   Recent Payments    │   │
│ Leads     │  │  Status (Donut)  │  │                      │   │
│ Promotions│  │    ┌───┐         │  │  Ref  │ Customer │ ₱ │   │
│ Reports   │  │   /     \        │  │  TC.. │ Juan D.  │5k │   │
│ Profile   │  │  │  72   │       │  │  TC.. │ Maria S. │3k │   │
│ Support   │  │   \     /        │  │  TC.. │ Pedro R. │8k │   │
│           │  │    └───┘         │  │                      │   │
│ Sign Out  │  │  Upcoming│ 45    │  └──────────────────────┘   │
│           │  │ Completed│ 89    │                              │
│           │  │ Cancelled│ 22    │  ┌──────────────────────┐   │
│           │  └──────────────────┘  │   Top Packages       │   │
│           │                        │  🏝 Boracay  ★4.8     │   │
│           │                        │  🏔 Palawan  ★4.7     │   │
│           │                        │  🗼 Tokyo    ★4.9     │   │
│           │                        └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Primary File:** `client/TravelConnect.Client/src/pages/admin/DashboardPage.jsx` (367 lines)

**Supporting Files:**
- `client/TravelConnect.Client/src/components/admin/AdminLayout.jsx` — Sidebar + header shell
- `client/TravelConnect.Client/src/components/admin/ReportChart.jsx` — Chart.js wrapper
- `client/TravelConnect.Client/src/hooks/usePublicStats.js` — Public stats fetcher

---

## How to Take Screenshot

1. Start the backend: `cd server/TravelConnect.Server && dotnet run`
2. Start the frontend: `cd client/TravelConnect.Client && npm run dev`
3. Open `http://localhost:5173/admin/dashboard`
4. Log in as Super Admin (`superadmin@travelconnect.com` / `123123`)
5. Take a full-page screenshot of the dashboard

---

## API Endpoints Used

| Endpoint | Method | Role in This Screen |
|----------|--------|-------------------|
| `GET /api/dashboard` | GET | Fetches aggregated KPI data: total bookings, revenue, status counts, customer/supplier/package/lead/inquiry counts, payment summary (collected/pending/refunded) |
| `GET /api/dashboard/public` | GET | Fetches homepage stats: happy travelers count, countries covered, average rating, destination/package/hotel/car/flight/activity/supplier/booking counts |
| `GET /api/bookings` | GET | Fetches all bookings for the status strip (upcoming/completed/cancelled/refunded counts) and donut chart |
| `GET /api/payments` | GET | Fetches all payments for the "Recent Payments" table |
| `GET /api/packages/featured/6` | GET | Fetches top 6 featured packages sorted by rating for the "Top Packages" section |

---

## Algorithms Used

### Dashboard Aggregation Query
The `DashboardController` performs multiple EF Core LINQ queries to compute:
```csharp
TotalBookings    = await db.Bookings.CountAsync();
TotalRevenue     = await db.Payments.Where(p => p.Status == "Paid").SumAsync(p => p.Amount);
UpcomingCount    = await db.Bookings.CountAsync(b => b.Status == "upcoming");
CompletedCount   = await db.Bookings.CountAsync(b => b.Status == "completed");
// ... etc for each KPI
```

### Revenue Calculation
```csharp
TotalRevenue = await db.Payments
    .Where(p => p.Status == "Paid")
    .SumAsync(p => p.Amount);
```

### Status Distribution (for Donut Chart)
```csharp
var statusGroups = await db.Bookings
    .GroupBy(b => b.Status)
    .Select(g => new { Status = g.Key, Count = g.Count() })
    .ToListAsync();
```

### Featured Packages
```csharp
var featured = await db.Packages
    .Where(p => p.Status == "Active")
    .OrderByDescending(p => p.Rating)
    .ThenByDescending(p => p.Reviews)
    .Take(6)
    .ToListAsync();
```

---

## Dashboard Data Model

| KPI Card | Data Source | Computation |
|----------|------------|-------------|
| Total Bookings | `Bookings` table | `COUNT(*)` |
| Total Revenue | `Payments` table | `SUM(Amount) WHERE Status = 'Paid'` |
| Active Packages | `Packages` table | `COUNT(*) WHERE Status = 'Active'` |
| Active Flights | `Flights` table | `COUNT(*) WHERE Status = 'Active'` |
| Upcoming | `Bookings` table | `COUNT(*) WHERE Status = 'upcoming'` |
| Completed | `Bookings` table | `COUNT(*) WHERE Status = 'completed'` |
| Cancelled | `Bookings` table | `COUNT(*) WHERE Status = 'cancelled'` |
| Refunded | `Bookings` table | `COUNT(*) WHERE Status = 'refunded'` |
