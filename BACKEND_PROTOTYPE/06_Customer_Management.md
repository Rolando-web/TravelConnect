# Section 06 — Customer Management Screen

> **Figure 6 — Customer Management (`/admin/customers`)**

---

## Screenshot Description

The Customer Management screen handles customer CRUD:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  Header: TravelConnect / Customers    │  Admin ▼   │
│           │─────────────────────────────────────────────────────│
│ Dashboard │  ┌────────┐ ┌──────────┐ ┌────────────────────┐   │
│ Users     │  │ Total  │ │  Active  │ │ Countries          │   │
│ Customers │  │   45   │ │    38    │ │       12           │   │
│ Suppliers │  └────────┘ └──────────┘ └────────────────────┘   │
│ Packages  │                                                     │
│ Bookings  │  [All] [Active] [Inactive]                         │
│ Payments  │  🔍 Search...                   [+ Add Customer]   │
│ Leads     │─────────────────────────────────────────────────────│
│ Promotions│  ID │ Name       │ Email          │Country│Status  │
│ Reports   │  1  │ Juan D.    │ juan@mail.com  │ PH    │ Active │
│ Profile   │  2  │ Maria S.   │ maria@mail.com │ JP    │ Active │
│ Support   │  3  │ Pedro R.   │ pedro@mail.com │ US    │ Inactive│
│           │     │            │                │       │        │
│ Sign Out  │  ◄ 1 2 ... ►              Showing 1-10 of 45     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Primary File:** `client/TravelConnect.Client/src/pages/admin/CustomersPage.jsx` (215 lines)

**Supporting Files:**
- `server/TravelConnect.Server/Controllers/CustomersController.cs` — REST API
- `client/TravelConnect.Client/src/components/admin/CrudModal.jsx` — Create/Edit modal

---

## How to Take Screenshot

1. Navigate to `http://localhost:5173/admin/customers`
2. Take screenshot showing stats cards and customer table

---

## API Endpoints Used

| Endpoint | Method | Role in This Screen |
|----------|--------|-------------------|
| `GET /api/customers` | GET | Fetches all customer records |
| `GET /api/customers/{id}` | GET | Fetches a single customer |
| `POST /api/customers` | POST | Creates a new customer |
| `PUT /api/customers/{id}` | PUT | Updates customer details |
| `DELETE /api/customers/{id}` | DELETE | Removes a customer record |

---

## Algorithms Used

### Country Unique Count
```javascript
const countriesCount = new Set(customers.map(c => c.country)).size;
```

### Active Customer Count
```javascript
const activeCount = customers.filter(c => c.status === 'Active').length;
```

### Customer Search
```javascript
const filtered = customers.filter(c =>
  c.name.toLowerCase().includes(search.toLowerCase()) ||
  c.email.toLowerCase().includes(search.toLowerCase()) ||
  c.phone.includes(search)
);
```

---

## Customer Data Model

| Field | Type | Description |
|-------|------|-------------|
| Id | int | Primary key |
| Name | string | Full name |
| Email | string | Contact email |
| Phone | string | Contact phone |
| Country | string | Country of origin |
| TotalBookings | int | Number of bookings made |
| TotalSpent | decimal | Total amount spent (₱) |
| Status | string | Active / Inactive |
