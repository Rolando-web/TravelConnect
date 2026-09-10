# Section 11 — CRM Leads Screen

> **Figure 11 — CRM Leads Management (`/admin/leads`)**

---

## Screenshot Description

The CRM Leads screen manages the sales pipeline:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  Header: TravelConnect / Leads          │  Admin ▼ │
│           │─────────────────────────────────────────────────────│
│ Dashboard │  ┌────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ │
│ Users     │  │ Total  │ │   New    │ │Qualified│ │Conv. %  │ │
│ Customers │  │   23   │ │     8    │ │    5    │ │  22%    │ │
│ Suppliers │  └────────┘ └──────────┘ └─────────┘ └─────────┘ │
│ Packages  │                                                     │
│ Bookings  │  [All][New][Qualified][Negotiation][Proposal][Won] │
│ Payments  │  🔍 Search...                     [+ Add Lead]     │
│ Leads     │─────────────────────────────────────────────────────│
│ Promotions│  Name     │ Email       │ Interest  │Stage    │Act  │
│ Reports   │  Ana M.   │ ana@m.com   │ Bali Trip │New     │ •   │
│ Profile   │  Bob L.   │ bob@m.com   │ Tokyo     │Qualif. │ •   │
│ Support   │  Cathy W. │ cathy@m.com │ Paris     │Proposal│ •   │
│           │           │             │           │        │     │
│ Sign Out  │  ◄ 1 2 ... ►              Showing 1-10 of 23     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Primary File:** `client/TravelConnect.Client/src/pages/admin/LeadsPage.jsx` (211 lines)

**Supporting Files:**
- `server/TravelConnect.Server/Controllers/LeadsController.cs` — REST API
- `client/TravelConnect.Client/src/components/admin/CrudModal.jsx` — Create/Edit modal

---

## How to Take Screenshot

1. Navigate to `http://localhost:5173/admin/leads`
2. Take screenshot showing stats cards, stage filters, and leads table

---

## API Endpoints Used

| Endpoint | Method | Role in This Screen |
|----------|--------|-------------------|
| `GET /api/leads` | GET | Fetches all lead records |
| `GET /api/leads/{id}` | GET | Fetches a single lead |
| `POST /api/leads` | POST | Creates a new lead |
| `PUT /api/leads/{id}` | PUT | Updates lead stage, notes, assignment |
| `DELETE /api/leads/{id}` | DELETE | Removes a lead record |

---

## Algorithms Used

### Conversion Rate
```javascript
const closedWon = leads.filter(l => l.stage === 'Closed Won').length;
const conversionRate = leads.length > 0
  ? ((closedWon / leads.length) * 100).toFixed(0)
  : 0;
```

### Pipeline Stage Progression
```
New → Qualified → Negotiation → Proposal → Closed Won
```

### Stage Counts
```javascript
const stageCounts = {
  new:        leads.filter(l => l.stage === 'New').length,
  qualified:  leads.filter(l => l.stage === 'Qualified').length,
  negotiation: leads.filter(l => l.stage === 'Negotiation').length,
  proposal:   leads.filter(l => l.stage === 'Proposal').length,
  closedWon:  leads.filter(l => l.stage === 'Closed Won').length,
};
```

---

## Lead Pipeline Stages

| Stage | Badge Color | Description |
|-------|------------|-------------|
| New | Purple | Initial inquiry received |
| Qualified | Purple | Meets criteria, worth pursuing |
| Negotiation | Amber | In active discussion |
| Proposal | Purple | Quote/proposal sent |
| Closed Won | Green | Successfully converted to customer |

---

## Lead Data Model

| Field | Type | Description |
|-------|------|-------------|
| Id | int | Primary key |
| Name | string | Contact name |
| Email | string | Contact email |
| Phone | string | Contact phone |
| Interest | string | What they're interested in |
| Stage | string | Pipeline stage |
| AssignedTo | string | Staff member assigned |
| LastContact | string | Last contact date |
| Notes | string | Internal notes |
