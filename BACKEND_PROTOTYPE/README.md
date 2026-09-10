# TravelConnect — Backend Prototype Documentation

> **Project:** TravelConnect — Online Travel Agency Platform
> **Backend Stack:** ASP.NET Core 10 / Entity Framework Core 9 / SQL Server / Firebase Firestore
> **Date:** September 2026
> **Total API Endpoints:** ~68 | **Controllers:** 18 | **Services:** 4

---

## Table of Contents

| Section | Title | Figure |
|---------|-------|--------|
| [01](01_System_Architecture.md) | System Architecture Overview | Figure 1 |
| [02](02_Admin_Dashboard.md) | Admin Dashboard Screen | Figure 2 |
| [03](03_Booking_Management.md) | Booking Management Screen | Figure 3 |
| [04](04_Payment_Management.md) | Payment Management Screen | Figure 4 |
| [05](05_Reports_Analytics.md) | Reports & Analytics Screen | Figure 5 |
| [06](06_Customer_Management.md) | Customer Management Screen | Figure 6 |
| [07](07_Supplier_Management.md) | Supplier Management Screen | Figure 7 |
| [08](08_Package_Management.md) | Travel Package Management Screen | Figure 8 |
| [09](09_Destination_Management.md) | Destination Management Screen | Figure 9 |
| [10](10_Promotions_Management.md) | Promotions Management Screen | Figure 10 |
| [11](11_CRM_Leads.md) | CRM Leads Screen | Figure 11 |
| [12](12_Support_Inquiries.md) | Support/Inquiries Screen | Figure 12 |
| [13](13_Seat_Map.md) | Seat Map Management Screen | Figure 13 |
| [14](14_Image_Upload.md) | Image Upload & Storage Screen | Figure 14 |
| [15](15_Authentication.md) | Authentication & Authorization Screen | Figure 15 |
| [16](16_Email_Notification.md) | Email Notification System | Figure 16 |
| [17](17_PDF_Generation.md) | PDF Generation System | Figure 17 |

---

## Quick Reference — All API Endpoints

### Core CRUD Endpoints

| Controller | Base Route | CRUD |
|-----------|-----------|------|
| BookingsController | `/api/bookings` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |
| PaymentsController | `/api/payments` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |
| CustomersController | `/api/customers` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |
| SuppliersController | `/api/suppliers` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |
| PackagesController | `/api/packages` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |
| FlightsController | `/api/flights` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |
| HotelsController | `/api/hotels` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |
| CarsController | `/api/cars` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |
| ActivitiesController | `/api/activities` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |
| DestinationsController | `/api/destinations` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |
| LeadsController | `/api/leads` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |
| PromotionsController | `/api/promotions` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |
| InquiriesController | `/api/inquiries` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |
| UsersController | `/api/users` | GET, GET/{id}, POST, PUT/{id}, DELETE/{id} |

### Specialized Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/test` | GET | Health check |
| `GET /api/dashboard` | GET | Admin KPI summary |
| `GET /api/dashboard/public` | GET | Public homepage stats |
| `GET /api/packages/featured/{count}` | GET | Top-rated packages |
| `GET /api/packages/location/{location}` | GET | Search by location |
| `GET /api/packages/tag/{tag}` | GET | Filter by tag |
| `GET /api/promotions/code/{code}` | GET | Validate promo code |
| `GET /api/bookings/reference/{ref}` | GET | Get by reference |
| `GET /api/bookings/customer/{email}` | GET | Get by customer |
| `GET /api/bookings/{id}/refund-preview` | GET | Preview refund |
| `POST /api/bookings/{id}/cancel` | POST | Cancel booking |
| `POST /api/bookings/{id}/itinerary-pdf` | POST | Generate PDF |
| `POST /api/bookings/{id}/send-confirmation` | POST | Send email |
| `POST /api/payments/paymongo/source` | POST | Create PayMongo source |
| `GET /api/payments/paymongo/source/{id}` | GET | Check source status |
| `POST /api/payments/paymongo/pay` | POST | Finalize payment |
| `POST /api/payments/paymongo/webhook` | POST | PayMongo webhook |
| `GET /api/payments/reconciliation` | GET | Payment reconciliation |
| `POST /api/payments/{id}/refund-to-wallet` | POST | Refund to wallet |
| `GET /api/seatmaps/flight/{id}` | GET | Generate seat map |
| `PUT /api/seatmaps/reserve` | PUT | Reserve seat |
| `PUT /api/seatmaps/release` | PUT | Release seat |
| `PUT /api/seatmaps/release-by-booking/{id}` | PUT | Bulk release seats |
| `PUT /api/seatmaps/confirm` | PUT | Confirm seat |
| `PUT /api/seatmaps/admin-override` | PUT | Admin seat override |
| `POST /api/images` | POST | Upload image |
| `GET /api/images/{id}` | GET | Retrieve image |
| `DELETE /api/images/{id}` | DELETE | Delete image |

---

## Quick Reference — All Algorithms

| Algorithm | File | Purpose |
|-----------|------|---------|
| Tiered Cancellation/Refund | `CancellationService.cs` | Time-based refund: 100% (0-7d), 50% (8-14d), 0% (15+d) |
| PayMongo Source Creation | `PayMongoService.cs` | Payment source with centavo conversion |
| HMAC-SHA256 Verification | `PayMongoService.cs` | Webhook signature verification |
| Seat Map Generation | `SeatMapsController.cs` | Grid generation + type classification |
| Booking-Payment Linking | `BookingsController.cs` | Auto-link pending payments |
| PDF Generation | `PdfService.cs` | QuestPDF A4 document builder |
| Email HTML Templates | `EmailService.cs` | Dynamic HTML with inline CSS |
| AES-256-GCM Encryption | `encryption.js` | PBKDF2 key derivation (100K iterations) |
| SQL/NoSQL/XSS Detection | `validation.js` | 34 regex security patterns |
| Rate Limiting | `validation.js` | Per-key client-side rate limiting |
| Multi-Currency Conversion | `CurrencyContext.jsx` | PHP-based 30-currency conversion |
| CSV Export | `AdminTable.jsx` | Client-side CSV generation |
| Promo Code Validation | `PromotionsController.cs` | Server-side code lookup |

---

## Running the Application

```bash
# Backend (.NET)
cd server/TravelConnect.Server
dotnet run
# → http://localhost:5110

# Frontend (React)
cd client/TravelConnect.Client
npm install
npm run dev
# → http://localhost:5173

# Health Check
curl http://localhost:5110/api/test
# → { "message": "TravelConnect API is working!" }
```

---

*TravelConnect Backend Prototype — IT15 Project — September 2026*
