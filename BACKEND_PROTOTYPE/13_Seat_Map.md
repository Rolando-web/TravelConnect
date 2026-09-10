# Section 13 — Seat Map Management Screen

> **Figure 13 — Seat Map Modal (Flight Booking)**

---

## Screenshot Description

The Seat Map modal shows an interactive seat selection grid:

```
┌─────────────────────────────────────────────────────────────────┐
│                        SELECT YOUR SEAT                         │
│─────────────────────────────────────────────────────────────────│
│                                                                 │
│   A   B   C       D   E   F          WINDOW │ MIDDLE │ AISLE   │
│  ┌───┬───┬───┐   ┌───┬───┬───┐              │        │         │
│ 1│ 🟢│ 🟢│ 🟢│   │ 🟢│ 🟢│ 🟢│     ROW 1   │   1    │  1      │
│  └───┴───┴───┘   └───┴───┴───┘              │        │         │
│  ┌───┬───┬───┐   ┌───┬───┬───┐              │        │         │
│ 2│ 🟢│ 🟡│ 🟢│   │ 🟢│ 🟢│ 🟢│     ROW 2   │   2    │  2      │
│  └───┴───┴───┘   └───┴───┴───┘              │        │         │
│  ┌───┬───┬───┐   ┌───┬───┬───┐              │        │         │
│ 3│ 🟢│ 🟢│ 🔴│   │ 🟢│ 🟢│ 🟢│     ROW 3   │   3    │  3      │
│  └───┴───┴───┘   └───┴───┴───┘              │        │         │
│  ┌───┬───┬───┐   ┌───┬───┬───┐              │        │         │
│ 4│ 🟢│ 🟢│ 🟢│   │ 🔴│ 🟢│ 🟢│     ROW 4   │   4    │  4      │
│  └───┴───┴───┘   └───┴───┴───┘              │        │         │
│      ...         ...                         │        │         │
│  ┌───┬───┬───┐   ┌───┬───┬───┐              │        │         │
│30│ 🟢│ 🟢│ 🟢│   │ 🟢│ 🟢│ 🟢│     ROW 30  │   30   │  30     │
│  └───┴───┴───┘   └───┴───┴───┘              │        │         │
│                                                                 │
│  Legend: 🟢 Available  🟡 Reserved  🔴 Sold  ⬜ Locked          │
│                                                                 │
│  ┌──────────────────────────────────────────────┐              │
│  │  Selected: 12A  │  Class: Economy  │  ₱3,200│              │
│  │                           [Confirm Seat]     │              │
│  └──────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Frontend:** `client/TravelConnect.Client/src/components/modals/booking/SeatMapModal.jsx`

**Backend:** `server/TravelConnect.Server/Controllers/SeatMapsController.cs`

---

## How to Take Screenshot

1. Start a flight booking from the homepage or `/flights`
2. Select a flight and proceed to seat selection
3. The Seat Map modal opens with the interactive grid
4. Take screenshot of the modal

---

## API Endpoints Used

| Endpoint | Method | Role in This Screen |
|----------|--------|-------------------|
| `GET /api/seatmaps/flight/{flightId}` | GET | Generates a full seat grid (TotalRows × columns), marks occupied/reserved/sold seats, classifies each seat type |
| `PUT /api/seatmaps/reserve` | PUT | Reserves a seat — checks availability, returns HTTP 409 if already occupied |
| `PUT /api/seatmaps/release` | PUT | Releases a seat back to "Available" status |
| `PUT /api/seatmaps/release-by-booking/{bookingId}` | PUT | Bulk releases all seats for a booking (on cancellation) |
| `PUT /api/seatmaps/confirm` | PUT | Confirms a seat as "Sold" for a booking segment |
| `PUT /api/seatmaps/admin-override` | PUT | Admin force-reassigns a seat to a different seat number |

---

## Algorithms Used

### Seat Grid Generation
```csharp
// Generate seat grid from flight configuration
var seats = new List<object>();
for (int row = 1; row <= flight.TotalRows; row++)
{
    foreach (var col in flight.SeatConfig.Split(','))
    {
        var seatNumber = $"{row}{col}";
        var status = occupiedSeats.Contains(seatNumber) ? "Sold" : "Available";
        var type = GetSeatType(col, flight.SeatConfig);
        seats.Add(new { SeatNumber = seatNumber, Status = status, Type = type });
    }
}
```

### Seat Type Classification (3-3 Config)
```csharp
private string GetSeatType(string column, string seatConfig)
{
    var columns = seatConfig.Split(',');
    var index = Array.IndexOf(columns, column);
    var totalColumns = columns.Length;

    if (index == 0 || index == totalColumns - 1) return "Window";
    if (index == totalColumns / 2 - 1 || index == totalColumns / 2) return "Aisle";
    return "Middle";
}
// A,B,C | D,E,F  →  A=Window, B=Middle, C=Aisle, D=Aisle, E=Middle, F=Window
```

### Seat Status Machine
```
Available → Reserved → Sold
Reserved  → Available (release)
Sold      → Available (cancellation/release)
```

### Conflict Detection
```csharp
// Before reserving, check if seat is available
var seat = seats.FirstOrDefault(s => s.SeatNumber == seatNumber);
if (seat == null || seat.Status != "Available")
    return Conflict(new { message = "Seat is not available" });
```

### Bulk Seat Release (On Cancellation)
```csharp
foreach (var flight in booking.BookingFlights.Where(f => f.SeatStatus != "Available"))
{
    flight.SeatStatus = "Available";
    flight.SeatNumber = string.Empty;
}
```

---

## Seat Configuration

| Aircraft Config | Columns | Window | Aisle | Middle |
|----------------|---------|--------|-------|--------|
| 3-3 (Default) | A,B,C,D,E,F | A, F | C, D | B, E |
| 2-2 | A,B,C,D | A, D | B, C | — |
| 2-3-2 | A,B,C,D,E,F,G | A, G | C, D | B, E, F |
