# Section 08 — Travel Package Management Screen

> **Figure 8 — Travel Package Management (`/admin/packages`)**

---

## Screenshot Description

The Package Management screen handles all travel packages:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  Header: TravelConnect / Packages     │  Admin ▼   │
│           │─────────────────────────────────────────────────────│
│ Dashboard │  ┌────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ │
│ Users     │  │ Total  │ │  Active  │ │Featured │ │ Reviews │ │
│ Customers │  │   18   │ │    15    │ │    4    │ │   245   │ │
│ Suppliers │  └────────┘ └──────────┘ └─────────┘ └─────────┘ │
│ Packages  │                                                     │
│ Bookings  │  [All][Active][Featured][Inactive]                 │
│ Payments  │  [Best Seller][TRENDING][New]  [+ Add Package]     │
│ Leads     │─────────────────────────────────────────────────────│
│ Promotions│  Name       │ Location │Price│Rating│Tag      │Status│
│ Reports   │  Boracay    │ PH       │5,200│★4.8  │Best Sell│ Act │
│ Profile   │  Tokyo Tour │ JP       │8,900│★4.9  │TRENDING │ Act │
│ Support   │  Bali Relax │ ID       │4,500│★4.6  │New      │ Act │
│           │             │          │     │      │         │     │
│ Sign Out  │  ◄ 1 2 ... ►              Showing 1-10 of 18     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Primary File:** `client/TravelConnect.Client/src/pages/admin/PackagesPage.jsx` (361 lines)

**Supporting Files:**
- `server/TravelConnect.Server/Controllers/PackagesController.cs` — REST API
- `client/TravelConnect.Client/src/components/admin/CrudModal.jsx` — Create/Edit/View modal

---

## How to Take Screenshot

1. Navigate to `http://localhost:5173/admin/packages`
2. Take screenshot showing stats cards, filter buttons, and package table

---

## API Endpoints Used

| Endpoint | Method | Role in This Screen |
|----------|--------|-------------------|
| `GET /api/packages` | GET | Fetches all packages with supplier info |
| `GET /api/packages/{id}` | GET | Fetches a single package (for detail modal) |
| `GET /api/packages/featured/{count}` | GET | Fetches top-rated active packages (default 6) |
| `GET /api/packages/location/{location}` | GET | Searches packages by location (case-insensitive contains) |
| `GET /api/packages/tag/{tag}` | GET | Filters packages by tag (e.g., "Best Seller", "TRENDING") |
| `POST /api/packages` | POST | Creates a new package |
| `PUT /api/packages/{id}` | PUT | Updates a package |
| `DELETE /api/packages/{id}` | DELETE | Removes a package record |
| `POST /api/images` | POST | Uploads package image to SQL Server as varbinary |

---

## Algorithms Used

### Featured Packages Query
```csharp
var featured = await db.Packages
    .Where(p => p.Status == "Active")
    .OrderByDescending(p => p.Rating)
    .ThenByDescending(p => p.Reviews)
    .Take(count)
    .ToListAsync();
```

### Location Search (Server-Side)
```csharp
var results = await db.Packages
    .Where(p => p.Location.ToLower().Contains(location.ToLower()))
    .ToListAsync();
```

### Itinerary Parsing
```javascript
// Pipe-delimited itinerary string → day-by-day display
const itineraryDays = package.itinerary.split('|');
// ["Day 1: Arrival & Check-in", "Day 2: Island Hopping", "Day 3: Departure"]
```

### Tag Filtering (Client-Side)
```javascript
const filtered = packages.filter(p =>
  activeTag === '' || p.tag === activeTag
);
```

---

## Package Data Model

| Field | Type | Description |
|-------|------|-------------|
| Id | int | Primary key |
| Name | string | Package name |
| Location | string | Destination |
| Description | string | Detailed description |
| Duration | string | e.g., "4D / 3N" |
| Price | decimal | Price in PHP |
| Rating | decimal | Average rating (1.0–5.0) |
| Reviews | int | Number of reviews |
| Tag | string | "Best Seller", "TRENDING", "New" |
| ImageUrl | string | Package cover image |
| Status | string | Active / Featured / Inactive |
| Itinerary | string | Pipe-delimited day-by-day plan |
| Inclusions | string | Pipe-delimited included items |
| Exclusions | string | Pipe-delimited excluded items |
| SupplierId | int? | FK to Suppliers |
