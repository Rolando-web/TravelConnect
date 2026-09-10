# Section 01 — System Architecture Overview

> **Figure 1 — TravelConnect System Architecture Diagram**

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRAVELCONNECT ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   React 19   │───▶│  .NET 10 API │───▶│  SQL Server  │      │
│  │   Frontend   │    │   Backend    │    │  (Primary)   │      │
│  │  (Vite 8)    │    │  (ASP.NET)   │    │              │      │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘      │
│         │                   │                                    │
│         │                   ├──────────▶ Firebase Firestore     │
│         │                   │           (User Auth + Profiles)  │
│         │                   │                                    │
│         │                   ├──────────▶ PayMongo API           │
│         │                   │           (GCash/PayMaya)         │
│         │                   │                                    │
│         │                   ├──────────▶ MailKit/SMTP           │
│         │                   │           (Email Service)         │
│         │                   │                                    │
│         │                   └──────────▶ QuestPDF               │
│         │                               (PDF Generation)        │
│         │                                                        │
│         └──▶ Firebase Auth ──▶ Firebase Firestore                │
│              (Email/Google)     (Client-side Data Layer)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend | React | 19.2.8 | UI framework |
| Build Tool | Vite | 8.2.0 | Dev server & bundling |
| Styling | TailwindCSS | 4.3.3 | Utility-first CSS |
| Icons | Lucide React | 1.33.0 | Icon library |
| Charts | Chart.js | 4.5.1 | Admin analytics |
| Backend | ASP.NET Core | 10.0 | REST API framework |
| ORM | Entity Framework Core | 9.0.0 | Database access |
| Database | Microsoft SQL Server | — | Primary relational DB |
| Auth DB | Firebase Firestore | — | User profiles & RBAC |
| Auth | Firebase Auth | 12.18.0 | Email/Password + Google OAuth |
| Payments | PayMongo API | — | GCash & PayMaya |
| Email | MailKit | 4.17.0 | SMTP email delivery |
| PDF | QuestPDF | 2024.12.0 | E-ticket generation |
| Storage | Docker | — | Server containerization |
| Hosting | Vercel | — | Client SPA deployment |

---

## Dual-Database Architecture

**SQL Server (Primary)** — Stores all operational data:
- Bookings, Payments, Packages, Flights, Hotels, Cars, Activities
- Destinations, Customers, Suppliers, Leads, Promotions, Inquiries
- System Users, Images (varbinary), Email Logs

**Firebase Firestore (Secondary)** — Handles auth and real-time features:
- User authentication profiles (Firebase Auth)
- Role-based access control (Firestore Security Rules)
- Audit log trail
- Client-side real-time data synchronization

---

## Backend Server Details

| Property | Value |
|----------|-------|
| HTTP Port | `http://localhost:5110` |
| HTTPS Port | `https://localhost:7241` |
| API Prefix | `/api/` |
| Total Endpoints | ~68 |
| Controllers | 18 |
| Services | 4 (Cancellation, Email, PayMongo, PDF) |
| Database Models | 17 (Entity Framework DbSets) |

---

## Source Code References

| File | Purpose |
|------|---------|
| `server/TravelConnect.Server/Program.cs` | App builder, DI registration, CORS, seed on startup |
| `server/TravelConnect.Server/Data/TravelConnectDbContext.cs` | EF Core DbContext (17 DbSets) |
| `server/TravelConnect.Server/Extensions/DatabaseInitializer.cs` | Schema creation + seed data |
| `client/TravelConnect.Client/src/App.jsx` | React Router — public + admin routes |
| `firebase.json` | Firebase/Firestore configuration |
| `firestore.rules` | 137-line RBAC security rules |
| `Dockerfile` | Multi-stage .NET 10 build |
| `vercel.json` | SPA deployment config |

---

## How to Run the Backend

```bash
# 1. Start the SQL Server (ensure it's running)
# 2. Start the .NET backend
cd server/TravelConnect.Server
dotnet run

# 3. Start the React frontend (new terminal)
cd client/TravelConnect.Client
npm install
npm run dev

# 4. Open browser
# Frontend: http://localhost:5173
# Backend API: http://localhost:5110/api/
# Health check: http://localhost:5110/api/test
```
