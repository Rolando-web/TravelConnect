# Section 12 — Support/Inquiries Screen

> **Figure 12 — Support Inquiries (`/admin/support`)**

---

## Screenshot Description

The Support screen handles customer inquiries:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  │  Header: TravelConnect / Support        │  Admin ▼ │
│           │─────────────────────────────────────────────────────│
│ Dashboard │  ┌────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ │
│ Users     │  │ Total  │ │ Pending  │ │In Prog. │ │Resolved │ │
│ Customers │  │   34   │ │    12    │ │    8    │ │   14    │ │
│ Suppliers │  └────────┘ └──────────┘ └─────────┘ └─────────┘ │
│ Packages  │                                                     │
│ Bookings  │  [All][Pending][In Progress][Resolved]             │
│ Payments  │  🔍 Search...                   [+ New Inquiry]    │
│ Leads     │─────────────────────────────────────────────────────│
│ Promotions│  ID │ Customer   │ Subject      │Category│Status  │
│ Reports   │  1  │ Juan D.    │ Baggage issue│General │Pending │
│ Profile   │  2  │ Maria S.   │ Refund req.  │Payment │In Prog │
│ Support   │  3  │ Pedro R.   │ Flight delay │Booking │Resolved│
│           │     │            │              │        │[Reply] │
│ Sign Out  │  ◄ 1 2 ... ►              Showing 1-10 of 34     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Primary File:** `client/TravelConnect.Client/src/pages/admin/SupportPage.jsx` (249 lines)

**Supporting Files:**
- `server/TravelConnect.Server/Controllers/InquiriesController.cs` — REST API
- `client/TravelConnect.Client/src/services/api.js` — API client (`inquiriesApi`)

---

## How to Take Screenshot

1. Navigate to `http://localhost:5173/admin/support`
2. Take screenshot showing stats cards, status filters, and inquiries table

---

## API Endpoints Used

| Endpoint | Method | Role in This Screen |
|----------|--------|-------------------|
| `GET /api/inquiries` | GET | Fetches all inquiry records |
| `GET /api/inquiries/{id}` | GET | Fetches a single inquiry |
| `POST /api/inquiries` | POST | Creates a new customer inquiry |
| `PUT /api/inquiries/{id}` | PUT | Updates inquiry with admin reply and status change |
| `DELETE /api/inquiries/{id}` | DELETE | Removes an inquiry record |

---

## Algorithms Used

### Status Filtering
```javascript
const filtered = activeTab === 'All'
  ? inquiries
  : inquiries.filter(i => i.status === activeTab);
```

### Status Counts
```javascript
const pendingCount = inquiries.filter(i => i.status === 'Pending').length;
const inProgressCount = inquiries.filter(i => i.status === 'In Progress').length;
const resolvedCount = inquiries.filter(i => i.status === 'Resolved').length;
```

### Reply Flow
```javascript
const handleReply = async (inquiryId, replyText) => {
  await api.put(`/api/inquiries/${inquiryId}`, {
    ...existingInquiry,
    reply: replyText,
    status: 'Resolved'
  });
};
```

---

## Inquiry Status Flow

```
Pending → In Progress → Resolved
```

| Status | Badge Color | Description |
|--------|------------|-------------|
| Pending | Amber | Awaiting initial response |
| In Progress | Purple | Being handled by staff |
| Resolved | Green | Issue addressed and closed |

---

## Inquiry Categories

| Category | Description |
|----------|-------------|
| General | General questions about the service |
| Booking | Booking-related issues |
| Payment | Payment and refund inquiries |
| Technical | Technical issues with the platform |

---

## Inquiry Data Model

| Field | Type | Description |
|-------|------|-------------|
| Id | int | Primary key |
| CustomerName | string | Inquirer name |
| CustomerEmail | string | Inquirer email |
| Subject | string | Inquiry subject |
| Category | string | General / Booking / Payment / Technical |
| Message | string | Detailed message body |
| Status | string | Pending / In Progress / Resolved |
| Reply | string | Admin reply text |
