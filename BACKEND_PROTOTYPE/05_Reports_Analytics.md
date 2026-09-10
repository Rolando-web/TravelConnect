# Section 05 — Reports & Analytics Screen

> **Figure 5 — Reports & Analytics (`/admin/reports`)**

---

## Screenshot Description

The Reports screen provides data visualization and CSV export:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  Header: TravelConnect / Reports     │  Admin ▼    │
│           │─────────────────────────────────────────────────────│
│ Dashboard │  📅 From: [Sep 2025]  To: [Sep 2026]  [Export CSV]│
│ Users     │─────────────────────────────────────────────────────│
│ Customers │                                                     │
│ Suppliers │  ┌──────────────────────────────────────────────┐  │
│ Packages  │  │  Revenue Trend (Line Chart)                  │  │
│ Bookings  │  │   ₱30k ┤                  ╭──╮              │  │
│ Payments  │  │   ₱20k ┤         ╭───────╯  ╰──╮           │  │
│ Leads     │  │   ₱10k ┤    ╭───╯              ╰──         │  │
│ Promotions│  │   ₱ 0k ┤───╯                                │  │
│ Reports   │  │        Oct Nov Dec Jan Feb Mar Apr May Jun   │  │
│ Profile   │  └──────────────────────────────────────────────┘  │
│ Support   │                                                     │
│           │  ┌─────────────────┐  ┌───────────────────────┐   │
│ Sign Out  │  │  By Category    │  │  By Status (Bar)      │   │
│           │  │  (Doughnut)     │  │                       │   │
│           │  │   ┌───┐         │  │  ┃██┃ 89             │   │
│           │  │  /  🟢 \       │  │  ┃██┃ 45             │   │
│           │  │ │ 🟡 🟠 │      │  │  ┃██┃ 22             │   │
│           │  │  \ 🔴 /        │  │  ┃██┃ 12             │   │
│           │  │   └───┘         │  │  Cmp Up  Can Ref     │   │
│           │  │  Flight│42%     │  │                       │   │
│           │  │  Hotel │28%     │  └───────────────────────┘   │
│           │  │  Car   │15%     │                               │
│           │  │  Pkg   │15%     │  ┌───────────────────────┐   │
│           │  └─────────────────┘  │  Top Destinations      │   │
│           │                       │  ▬▬▬▬▬▬▬ Boracay  45  │   │
│           │                       │  ▬▬▬▬▬▬  Tokyo    38  │   │
│           │                       │  ▬▬▬▬▬   Palawan  32  │   │
│           │                       │  ▬▬▬▬    Bali     28  │   │
│           │                       └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Primary File:** `client/TravelConnect.Client/src/pages/admin/ReportsPage.jsx` (407 lines)

**Supporting Files:**
- `client/TravelConnect.Client/src/components/admin/ReportChart.jsx` — Chart.js wrapper (48 lines)

---

## How to Take Screenshot

1. Navigate to `http://localhost:5173/admin/reports`
2. Wait for all 4 charts to render
3. Take a full-page screenshot showing all chart sections

---

## API Endpoints Used

| Endpoint | Method | Role in This Screen |
|----------|--------|-------------------|
| `GET /api/bookings` | GET | Fetches all bookings for chart data computation (client-side aggregation by month, category, status, destination) |
| `GET /api/payments` | GET | Fetches all payments for revenue trend calculations |

---

## Algorithms Used

### Monthly Revenue Aggregation (Client-Side)
```javascript
const monthlyRevenue = {};
bookings
  .filter(b => b.status === 'completed' || b.status === 'upcoming')
  .forEach(b => {
    const month = new Date(b.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + b.totalAmount;
  });
```

### Category Distribution
```javascript
const categoryData = {
  flight: bookings.filter(b => b.category === 'flight').length,
  hotel:  bookings.filter(b => b.category === 'hotel').length,
  car:    bookings.filter(b => b.category === 'car').length,
  package: bookings.filter(b => b.category === 'package').length,
};
```

### Destination Ranking
```javascript
const destCounts = {};
bookings.forEach(b => {
  destCounts[b.location] = (destCounts[b.location] || 0) + 1;
});
const topDestinations = Object.entries(destCounts)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10);
```

### CSV Export (Client-Sive)
```javascript
const handleExport = () => {
  const headers = columns.map(c => c.label).join(',');
  const rows = filtered.map(r =>
    columns.map(c => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  // ... download
};
```

---

## Chart Types Used

| Chart | Type | Library | Data Source |
|-------|------|---------|-------------|
| Revenue Trend | Line | Chart.js | Bookings grouped by month, summed by amount |
| Bookings by Category | Doughnut | Chart.js | Bookings grouped by category field |
| Bookings by Status | Bar | Chart.js | Bookings grouped by status field |
| Top Destinations | Horizontal Bar | Chart.js | Bookings grouped by location, sorted by count |

---

## Date Range Filtering

When date range filters are applied:
```javascript
const filteredBookings = bookings.filter(b => {
  const date = new Date(b.createdAt);
  return date >= fromDate && date <= toDate;
});
```

All chart computations are re-run on the filtered dataset.
