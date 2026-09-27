# Role-Based Access — TravelConnect (ERP & CRM for Travel Agencies)

Last revised: 2026-09-26

---

## Super Admin

Authentication
User Management (Manage)
Customer Management (Manage)
Travel Package Management (Manage)
Flight Management (Manage)
Hotel Management (Manage)
Car Rental Management (Manage)
Activity Management (Manage)
Destination Management (Manage)
Booking Management (Manage)
Supplier Management (Manage)
Payment Management (Manage)
CRM & Lead Management (Manage)
Promotion Management (Manage)
Reports (Manage)

---

## Agency Admin

Authentication
Customer Management (Manage)
Travel Package Management (Manage)
Flight Management (Manage)
Hotel Management (Manage)
Car Rental Management (Manage)
Activity Management (Manage)
Destination Management (Manage)
Booking Management (Manage)
Supplier Management (Manage)
Payment Management (View)
CRM & Lead Management (Manage)
Promotion Management (Manage)
Reports (View)

---

## Agency Staff

Authentication
Customer Management (Manage)
Travel Package Management (Manage)
Flight Management (Manage)
Hotel Management (Manage)
Car Rental Management (Manage)
Activity Management (Manage)
Destination Management (Manage)
Booking Management (Manage)
Supplier Management (View)
Payment Management (View)
CRM & Lead Management (Manage)
Promotion Management (Manage)
Reports (View)

---

## Finance Staff

Authentication
Customer Management (View)
Travel Package Management (View)
Booking Management (View)
Supplier Management (View)
Payment Management (Manage)
Promotion Management (Manage)
Reports (Manage)

---

## Supplier

Authentication
Supplier Management (Manage Own)
Travel Package Management (Manage Own)
Flight Management (Manage Own)
Hotel Management (Manage Own)
Car Rental Management (Manage Own)
Activity Management (Manage Own)
Booking Management (View Related)
Payment Management (View Related)

---

## Customer / Client

Authentication
Travel Package Management (View)
Destination Management (View)
Flight Management (View)
Hotel Management (View)
Car Rental Management (View)
Activity Management (View)
Booking Management (Manage Own)
Payment Management (Manage Own)
Customer Support / Inquiry (Submit)

---

## Changes Applied

- Added **Agency Admin** — was missing from the previous list.
- **Finance Staff** — removed the duplicated "Payment Management" entry; fixed "Suppliers Management" to "Supplier Management".
- **Agency Staff** — Supplier Management changed Manage → View; Reports changed Manage → View.
- **Agency Admin** — Payment Management and Reports set to View; Supplier Management set to Manage.
- Any module not listed under a role = **no access** (page hidden, route blocked).
