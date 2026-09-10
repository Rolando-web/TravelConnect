# Section 09 — Destination Management Screen

> **Figure 9 — Destination Management (`/admin/destinations`)**

---

## Screenshot Description

The Destination Management screen manages travel destinations:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  Header: TravelConnect / Destinations  │  Admin ▼  │
│           │─────────────────────────────────────────────────────│
│ Dashboard │  ┌────────┐ ┌──────────┐ ┌──────────────────┐     │
│ Users     │  │ Total  │ │  Active  │ │ Regions Covered  │     │
│ Customers │  │   15   │ │    14    │ │        5         │     │
│ Suppliers │  └────────┘ └──────────┘ └──────────────────┘     │
│ Packages  │                                                     │
│ Bookings  │  [All][Active][Inactive]                           │
│ Payments  │  [Visayas][Asia][Europe][Americas][Oceania]        │
│ Leads     │  🔍 Search...                    [+ Add Destination]│
│ Promotions│─────────────────────────────────────────────────────│
│ Reports   │  Name      │ Region │ Category  │Status│Packages   │
│ Profile   │  Boracay   │ Visayas│ Beach     │ Act  │ 3         │
│ Support   │  Tokyo     │ Asia   │ Urban     │ Act  │ 2         │
│           │  Paris     │ Europe │ Cultural  │ Act  │ 2         │
│ Sign Out  │  ◄ 1 2 ... ►              Showing 1-10 of 15     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Primary File:** `client/TravelConnect.Client/src/pages/admin/DestinationsPage.jsx` (382 lines)

**Supporting Files:**
- `server/TravelConnect.Server/Controllers/DestinationsController.cs` — REST API
- `client/TravelConnect.Client/src/components/admin/CrudModal.jsx` — Create/Edit/View modal

---

## How to Take Screenshot

1. Navigate to `http://localhost:5173/admin/destinations`
2. Take screenshot showing stats cards, region filters, and destination table

---

## API Endpoints Used

| Endpoint | Method | Role in This Screen |
|----------|--------|-------------------|
| `GET /api/destinations` | GET | Fetches all destination records |
| `GET /api/destinations/{id}` | GET | Fetches a single destination |
| `POST /api/destinations` | POST | Creates a new destination |
| `PUT /api/destinations/{id}` | PUT | Updates destination details |
| `DELETE /api/destinations/{id}` | DELETE | Removes a destination record |
| `GET /api/packages` | GET | Fetches packages to count packages per destination (client-side) |

---

## Algorithms Used

### Unique Region Count
```javascript
const regionsCount = new Set(destinations.map(d => d.region)).size;
```

### Package Count per Destination
```javascript
const packageCount = packages.filter(p =>
  p.location.toLowerCase().includes(destination.name.toLowerCase())
).length;
```

### Delete Confirmation
The destination page includes a custom delete confirmation modal:
```javascript
const [deleteConfirm, setDeleteConfirm] = useState(null);
// Shows warning message with destination name before deletion
```

---

## Destination Categories

| Category | Badge Color | Example |
|----------|------------|---------|
| Beach | Blue | Boracay, Palawan, Siargao |
| Island | Teal | El Nido, Cebu |
| Urban | Purple | Tokyo, Singapore, Bangkok |
| Cultural | Amber | Kyoto, Paris |
| Adventure | Red | Queenstown, Dubai |

---

## Destination Data Model

| Field | Type | Description |
|-------|------|-------------|
| Id | int | Primary key |
| Name | string | Destination name |
| Region | string | Visayas / Asia / Europe / Americas / Oceania |
| Category | string | Beach / Island / Urban / Cultural / Adventure |
| Description | string | Detailed description |
| ImageUrl | string | Cover image |
| Status | string | Active / Inactive |
