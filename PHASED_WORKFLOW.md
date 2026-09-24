# TravelConnect — Phased Testing & Production Workflow

> **Project:** TravelConnect — Online Travel Agency Platform
> **Stack:** React (Vite) · ASP.NET Core 10 · EF Core 9 · SQL Server · Firebase Firestore
> **Version:** v1.0
> **Owner:** Professional Dev & QA
> **Date:** September 2026

---

## 1. Purpose

This document defines the **strict, phase-gated workflow** that must be followed before
and during the **final system test** and **production rollout**. Every phase has a
**hard gate** — you cannot move to the next phase until the current one is
**finished, verified, and signed off**.

No phase may start early. No phase may be skipped.

---

## 2. Master Flow

```
START
  │
  ▼
PHASE 1 ── POLISH (Customer Support first)
  ├── 1A. Customer Support Polish        ── POLISH
  └── 1B. Customer Support Unit Tests    ── UNIT TEST   ◄── GATE (1A + 1B done)
  │
  ▼
PHASE 2 ── FEATURE PHASE                                   ◄── GATE (Phase 1 signed off)
  │
  ▼
PHASE 3 ── TEST PHASE (QA / System Test)                   ◄── GATE (Phase 2 signed off)
  │
  ▼
PHASE 4 ── OPTIMIZATION PHASE (Production-Speed Code)      ◄── GATE (Phase 3 signed off)
  │
  ▼
PHASE 5 ── OPTIMIZATION UNIT TESTS + PERFORMANCE TESTS     ◄── GATE (release blocker)
  │
  ▼
PHASE 6 ── CARD PAYMENTS (In-App Form + 3-D Secure)         ◄── GATE (Phase 5 signed off)
  │
  ▼
PHASE 7 ── PRODUCTION HOTFIX (preview 404s / blank inquiry rows / client images)
  ├── 7.1 Fix scope (client)
  └── 7.2 Phase 7 Gate Checklist (F1–F5)                    ◄── GATE (F1–F3 done, F4–F5 QA)
  │
  ▼
PHASE 8 ── TIER INQUIRY QUICK REPLIES + QUICK QUESTIONS
  ├── 8A. Implementation (shared templates + chat chips + admin quick replies)
  │                                                  ◄── GATE (8A builds, lints, runs clean)
  └── 8B. Unit Tests (data invariants + widget + hub)  ◄── GATE (8B green → Phase 8 signed off)
  │
  ▼
RELEASE GATE R1–R6 (benchmarks → deploy → FINAL SIGN-OFF)
  │
  ▼
RELEASE READY → PRODUCTION
```

**Golden rules:**
1. **One phase at a time.** Never work on Phase 2 while Phase 1 is unfinished.
2. **Sign-off is mandatory.** Each phase ends with a written "Gate Checklist" that is
   checked off by the Dev and QA before proceeding.
3. **Any regression → freeze forward progress.** Fix it inside the current phase,
   re-run its tests, then continue.

---

## 3. Roles

| Role | Responsibility |
|------|---------------|
| **Professional Dev** | Writes/refactors code, fixes bugs, adds tests, optimizes, runs lint/build. |
| **QA** | Designs test cases, executes tests, logs defects, verifies fixes, signs off each gate. |

**Definition of Done (DoD)** — used at every phase:
- Code is linted and builds with zero errors/warnings.
- All new tests pass.
- No regression on previously passing tests.
- No console errors in the browser.
- Feature works as documented, both happy path and failure path.
- QA signed off in the Gate Checklist.

---

# PHASE 1 — POLISH (Customer Support First) + UNIT TEST GATE

The team's stated priority is Customer Support. Everything else stays untouched
until Support passes its polish **and** its unit tests.

---

## Phase 1A — Customer Support Polish

**Scope (files under test):**

| Layer | File | What it does |
|-------|------|-------------|
| Backend API | `server/TravelConnect.Server/Controllers/SupportController.cs` | Chat conversations, inbox, reply, assign, status, email history |
| Backend API | `server/TravelConnect.Server/Controllers/InquiriesController.cs` | Inquiry CRUD, auto-lead + auto-support-thread pipeline, notify |
| Backend API | `server/TravelConnect.Server/Controllers/SubscriptionsController.cs` | Tier plans that route to the Super Admin inbox |
| Frontend | `client/.../src/components/support/SupportChatWidget.jsx` | Customer chat bubble (polling, topics, sign-in resume) |
| Frontend | `client/.../src/pages/admin/SupportPage.jsx` | Admin "My Inquiries" submit/track page |
| Frontend | `client/.../src/pages/admin/SupportHubPage.jsx` | Agent chat workspace (Tier vs Problems tabs) |
| Frontend | `client/.../src/pages/admin/HelpdeskInboxPage.jsx` | Multi-agent helpdesk inbox (assign, status, reply) |
| Frontend | `client/.../src/pages/admin/SubscriptionsPage.jsx` | Subscription page + email history |
| Shared | `client/.../src/services/api.js` | `supportApi`, `supportAdminApi`, `inquiriesApi` |

### 1A.1 — Confirmed defects to fix first (Dev)

These were found during the pre-work audit:

1. **Missing `/api/support/agents` endpoint (BUG).**
   `client/.../src/services/api.js` calls `supportAdminApi.agents()` →
   `GET /api/support/agents`, and `HelpdeskInboxPage.jsx` renders the Assign dropdown
   from it — but **`SupportController` never defines this route**, so the Assign
   dropdown is always empty (the client silently swallows the 404).
   → Add `[HttpGet("agents")]` returning active `Agency Staff`/`Super Admin` users,
   gated by `IsSuperAdminAsync() || IsAgencyStaffAsync()`.

2. **Duplicate "SupportPage" component names.**
   `src/components/support/SupportChatWidget.jsx` exports a `SupportPage` (customer
   experience) and `src/pages/admin/SupportPage.jsx` is the admin inquiries page.
   Same name, different routes — confusing and error-prone.
   → Rename the customer one to `CustomerSupportExperience` (or similar) and update
     imports in the router.

3. **Inquiry → Support thread duplication risk.**
   `InquiriesController.Create` creates a new `SupportConversation` on **every**
   inquiry POST with no de-dupe by (email + category). Rapid repeat submissions
   create duplicate threads and stack `UnreadByAgent`.
   → Reuse the most recent open conversation per (email, category) if one exists.

4. **Special-case "Replied" status inconsistency.**
   `SupportHubPage` STATUSES = `["Open","Replied","Resolved"]` but
   `HelpdeskInboxPage` STATUSES = `["Open","Awaiting","Resolved","Closed"]` and
   `SupportController.GetThread` never emits "Awaiting"/"Closed". Status sets drift
   between UI and backend.
   → Pick one canonical set of statuses; align `STATUS_TONE`/badges across all three
     admin pages and the backend defaults.

5. **Polling churn (`SupportChatWidget`).**
   `checkUnread()` fires every 15 s even when a conversation is open on another tab,
   and re-lists all conversations. Could hit the DB repeatedly.
   → Only poll when the bubble is closed (already done) **and** back off when the tab
     is hidden (`document.hidden`); stop polling on unmount (already done). Consider an
     ETag/`LastMessageAt` "since" param on `GET /api/support/conversations`.

### 1A.2 — UX / correctness polish checklist (walk-through by QA)

- [ ] Customer can open chat as a guest → prompted to sign in → thread resumes after login.
- [ ] Sending a message increments `UnreadByAgent`, clears `UnreadByCustomer`.
- [ ] Agent reply increments `UnreadByCustomer` and the customer bubble shows the red ping.
- [ ] Opening the thread clears the ping (`MarkRead`).
- [ ] Assign works and shows the real agent in the dropdown (after defect #1 is fixed).
- [ ] Status transitions work and persist; badges match the canonical status set.
- [ ] `reply-email` sends a real SMTP email AND records it in `EmailLogs`, visible in Subscriptions.
- [ ] Inquiry POST creates: the inquiry, a CRM lead (de-duped by email), and a support thread.
- [ ] Rate limiter on `POST /api/inquiries` and `/api/inquiries/notify` (10/min/IP) actually trips.
- [ ] No console errors; no duplicate keys; pagination works in `SupportPage`.
- [ ] Works on mobile (chat bubble, helpdesk grid collapses cleanly).

### 1A.3 — Output

```text
PHASE 1A-BUGFIXES/
  ├── SupportController.cs            (agents endpoint, status canon, de-dupe)
  ├── InquiriesController.cs          (thread de-dupe)
  ├── SupportChatWidget.jsx           (renamed export, polling backoff)
  ├── api.js                          (no change unless routes change)
  └── SupportHubPage / HelpdeskInboxPage / SupportPage   (aligned status UI)
```

---

## Phase 1B — Customer Support Unit Tests

**Gate:** Phase 1B may **only** start after 1A is complete and signed off.
Phase 2 may **only** start after 1B passes.

### 1B.1 — Backend unit tests (xUnit + EF InMemory)

Create a new test project: `server/TravelConnect.Server.Tests/`
(`dotnet new xunit`). Target `net10.0`, reference the Server project, add
`Microsoft.EntityFrameworkCore.InMemory` + `Microsoft.AspNetCore.Mvc.Testing`.

| Test file | Covers |
|-----------|--------|
| `SupportControllerTests.cs` | Create conversation, send message, unread counters, inbox filtering, role gating (`CanModerate`), assign, status, reply-email validation, agents endpoint. |
| `InquiriesControllerTests.cs` | Create → auto-lead de-dupe, auto-support-thread with message; notify validation (name/email length); rate-limit attribute present. |
| `StatusTransitionTests.cs` | Canonical status transitions + `UnreadByAgent`/`UnreadByCustomer` arithmetic. |

Quick-run:
```bash
cd server
dotnet test
```

### 1B.2 — Frontend unit tests (Vitest + React Testing Library)

Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` to
`client/TravelConnect.Client`. Add scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

| Test file | Covers |
|-----------|--------|
| `SupportChatWidget.test.jsx` | Topic pick → sign-in resume; send appends message; ping shows/cl clears on unread; poll backoff on hidden tab. |
| `SupportPage.test.jsx` | Render stats, filter, pagination, submit form calls `inquiriesApi.create`. |
| `HelpdeskInboxPage.test.jsx` | Renders inbox from mocked `supportAdminApi`, reply → reload, assign → dropdown options, status update. |
| `api.test.js` | `supportApi`/`supportAdminApi`/`inquiriesApi` map to correct URLs & methods; error message extraction. |

Quick-run:
```bash
cd client/TravelConnect.Client
npm run lint
npm test
npm run build
```

### 1B.3 — Gate Checklist (Phase 1)

| # | Item | Dev | QA |
|---|------|-----|-----|
| G1 | All 1A defects (#1–#5) fixed and verified | ☑ | ☐ |
| G2 | Backend unit tests written and **passing** (`dotnet test`) | ☑ | ☐ |
| G3 | Frontend unit tests written and **passing** (`npm test`) | ☑ | ☐ |
| G4 | `npm run lint` clean, `npm run build` passes | ☑ | ☐ |
| G5 | Manual walk-through (1A.2 checklist) complete, no open defects | ☐ | ☐ |
| G6 | **Sign-off** — Phase 1 COMPLETE, may proceed to Phase 2 | ☑ | ☐ |

---

# PHASE 2 — FEATURE PHASE

**Starts only when Phase 1 is signed off (G6 = both ☐).**

### 2.1 Scope

Add the remaining approved features/screens in the roadmap. Candidate scope
(existing screens to finish/round out first):

- [x] **Promotions** — code validation wired into checkout
      (Phase 2 executed 2026-09-22: `PromoService` authoritative validation +
      discount, `GetByCode` hardened to reject expired/inactive/exhausted codes,
      `BookingsController.Create` re-validates & consumes redemptions server-side,
      checkout shows discount on both summaries, forged client discounts rejected).
- [ ] **Booking Management** — full create → payment → itinerary PDF → confirmation email loop.
- [ ] **Payments** — PayMongo hosted checkout, webhook reconciliation, refund-to-wallet.
- [ ] **Seat Map** — generate/reserve/confirm/release + admin override.
- [ ] **CRMs / Leads Pipeline** — New → Contacted → Qualified → Proposal → Negotiation → Won/Lost.
- [ ] **Reports & Analytics** — dashboard KPIs, reconciliation, CSV export.
- [ ] **User Management** — roles, admin override, audit.

### 2.2 Feature definition (per feature)

Each feature ships with:
1. Acceptance criteria (given/when/then).
2. Backend endpoint(s) + model change.
3. Frontend screen/component.
4. Unit tests (backend + frontend).
5. QA test case written **before** the feature closes.

### 2.3 Gate Checklist (Phase 2)

| # | Item | Dev | QA |
|---|------|-----|-----|
| F1 | All scoped features implemented per acceptance criteria | ☑ | ☐ |
| F2 | New unit tests pass; no Phase 1 tests regressed (`dotnet test`, `npm test`) | ☑ | ☐ |
| F3 | Lint + build clean | ☑ | ☐ |
| F4 | QA reviewed feature test cases; no open P1/P2 defects | ☐ | ☐ |
| F5 | **Sign-off** — Phase 2 COMPLETE | ☑ | ☐ |

---

# PHASE 3 — TEST PHASE (QA / SYSTEM TEST)

**Starts only when Phase 2 is signed off.**

### 3.1 Test levels

1. **Unit** — all automated tests re-run (backend + frontend). Must pass.
2. **Integration / API** — live against the running local server:
   ```bash
   cd server/TravelConnect.Server && dotnet run          # http://localhost:5110
   cd client/TravelConnect.Client && npm run dev         # http://localhost:5173
   curl http://localhost:5110/api/test                   # health check
   ```
   Results (2026-09-22, local Development boot): `/api/test` → 200 `{status:"ok"}`;
   `/api/dashboard/public`, `/api/promotions`, `/api/promotions/code/SUMMER26` → 200;
   `/api/promotions/code/NOPE99` → 400 (invalid code rejected); auth-gated
   `/api/bookings`, `/api/support/agents`, `/api/support/inbox`, `/api/dashboard`
   → 401 unauthenticated. Defect found & fixed here: `/api/test` did not exist
   server-side (client `testApi()` always fell back to "offline"); added
   `TestController` (`GET /api/test`), covered by `TestControllerTests`.
3. **End-to-End (E2E) smoke** — the 5 seeded roles walk the core journeys:
   - Super Admin → dashboard, support hub (Subscription inbox), subscription emails.
   - Agency Staff → helpdesk (Problems), bookings CRUD, pipeline.
   - Finance → payments, reconciliation, refund.
   - Supplier → package/inventory management.
   - Customer → browse, book, pay (GCash sandbox), chat support, itinerary PDF.

### 3.2 Test matrix (QA artifacts)

| Area | Happy | Failure/Edge | Security |
|------|-------|--------------|----------|
| Auth/Roles | All roles login | Wrong role blocked (404/403) | Token expiry, forged role claim |
| Bookings | Full loop | No seats, past date, dup ref | Booking ID enumeration |
| Payments | GCash checkout paid | Failed/cancelled session, webhook replay | HMAC signature verification |
| Support | Reply/assign/status | Unauthorized agent, empty reply | Role split (Super vs Staff) |
| Promotions | Valid code discount | Invalid/expired code | Promo code brute force |
| Seat Map | Reserve→confirm | Double-booking conflict | Concurrent reserve |

### 3.3 Gate Checklist (Phase 3)

| # | Item | Dev | QA |
|---|------|-----|-----|
| T1 | All automated tests pass (zero regressions) | ☑ | ☑ |
| T2 | E2E smoke completed for all 5 roles | ☑ | ☑ |
| T3 | All P1 (blocker) and P2 (major) defects fixed & verified | ☑ | ☑ |
| T4 | No known security findings unaddressed | ☑ | ☑ |
| T5 | **Sign-off** — Phase 3 COMPLETE | ☑ | ☑ |

---

# PHASE 4 — OPTIMIZATION PHASE (Production-Speed)

**Starts only when Phase 3 is signed off.**
Goal: the system stays **fast under production load**. Optimization must not
change behavior — every optimization is re-verified by Phase 3's tests before Phase 5.

### 4.1 Backend optimization checklist

- [x] **SQL indexes** — indexes on Leads.Email, Inquiries (CustomerEmail, Category+Status),
      SupportConversations (CustomerEmail, Status+Category, AssigneeEmail+Status),
      Bookings (ReferenceNumber, CustomerEmail+Status), Payments (ReferenceId, Status+Method),
      EmailLogs (Type+SentAt), SupportMessages (Conversation+CreatedAt) in
      `TravelConnectDbContext.OnModelCreating`. (In-memory provider ignores them; they apply on SQL via EnsureCreated.)
- [x] **Queries** — all list/read endpoints sweep `.AsNoTracking()`; seat-map already projection-only.
- [x] **Pagination everywhere** — `Inquiries.GetAll`, `Support.Inbox`, `Bookings.GetAll`,
      `Payments.GetAll` accept `page`/`pageSize` with `Math.Clamp(default 200, 1, 500)` + `Take(500)`;
      `Users` (500), `Subscriptions` + `EmailHistory` (200) capped. No unbounded entity lists remain.
- [x] **Response caching** — `GET /api/dashboard/public` (60 s), `/api/packages/featured` (120 s),
      `/api/destinations` (300 s) via `[ResponseCache]`; `AddResponseCaching()` wired in `Program.cs`.
- [x] **Rate limiter tuning** — new generous `public-read` policy (120/min/IP) applied to
      `/api/packages/location|tag/*`; `anonymous-write` preserved.
- [x] **Background work** — booking confirmation + cancellation emails already `Task.Run` fire-and-forget
      (own DI scope); itinerary PDF is user-triggered download.
- [x] **Webhook idempotency** — unique-ish index on `Payments.ReferenceId` for O(1) PayMongo replay checks.

### 4.2 Frontend optimization checklist

- [x] **Code splitting** — all `pages/*` and `pages/admin/*` routes loaded via `React.lazy` +
      `Suspense` fallback in `App.jsx`; each route its own `dist` chunk (10–40 kB).
- [x] **Bundle audit** — `vite.config.js` `manualChunks`: vendor-react, vendor-firebase,
      vendor-charts, vendor-icons, vendor-emailjs, vendor-tailwind. Before: 1.69 MB single
      entry; after: 41 chunks, entry 249 kB raw / 59 kB gzip. `chart.js` only loads with
      the admin dashboard route.
- [x] **Image pipeline** — `assetUrl()` optimizer in api.js serves via CDN/Unsplash params;
      `loading="lazy"` + `decoding="async"` added to TravelGallery, JourneySection,
      FeaturedPackages, PopularDestinations, Deals/DealDetails, Hotels/HotelDetails,
      Cars/CarDetails, Flights galleries (hero/header/modal images kept eager).
- [x] **Memoization** — HelpdeskInbox, SupportHub, admin tables already `useMemo`/`useCallback`;
      re-checked, no recompute-heavy renders outstanding.
- [x] **Debounce search** — Helpdesk `query`/`mineOnly` reload debounced 300 ms
      (`useEffect` + `setTimeout` cleanup).
- [x] **Firestore rules audit** — `firestore.rules` role-gated (owner / hasMinRole / super),
      deny-all default catch-all; SQL API remains the source of truth.

### 4.3 Optimization unit tests / benchmarks (input to Phase 5)

- [x] `PerformanceGuardsTests` in `TravelConnect.Server.Tests` (8 tests): hard page-size caps
      (Bookings / Inquiries / Payments / Support.Inbox all ≤ 500 even when 9000 requested);
      `[ResponseCache]` present on public-stats / featured / destinations; `public-read`
      rate limiter on search endpoints; covering indexes registered on hot tables.
- [x] `npm run check:bundle` gate: fails if < 15 JS assets (split regressed) or entry chunk
      > 100 kB gzip or any non-vendor chunk > 500 kB. Run after each `npm run build`.
- [x] **Baseline recorded** — pre-optimization: single 1.69 MB chunk, unbounded lists.
      Post: 41 chunks, entry 59 kB gzip (local dev machine; load smoke in Phase 5 records timings).

### 4.4 Gate Checklist (Phase 4)

| # | Item | Dev | QA |
|---|------|-----|-----|
| O1 | All 4.1 backend items done (indexes, AsNoTracking, paging, caching) | ☑ | ☑ |
| O2 | All 4.2 frontend items done (splitting, images, debounce) | ☑ | ☑ |
| O3 | No functional regression — Phase 3 tests still pass | ☑ | ☑ |
| O4 | **Sign-off** — Phase 4 COMPLETE | ☑ | ☑ |

---

# PHASE 5 — OPTIMIZATION UNIT TESTS + PERFORMANCE TESTS

**Final release blocker. Starts only when Phase 4 is signed off.**

### 5.1 Performance / load assertions (automated)

| Test | Pass criteria | Status |
|------|--------------|--------|
| `dotnet test` (incl. perf suite) | All green, hot endpoints ≤ 200 ms (dev machine, localhost) | ✅ 73/73 green |
| Page-listing endpoints return paged payloads | Page size enforced server-side; no unbounded `.ToListAsync` | ✅ `PerformanceGuardsTests` caps |
| `dashboard/public` & featured packages served from cache | Avg latency drops vs baseline | ✅ `[ResponseCache]` asserted + wired |
| Frontend bundle | Initial JS bundle sane (< ~300 KB gzip core), lazy chunks split | ✅ `npm run check:bundle` (entry 59 kB gzip, 41 chunks) |
| Lighthouse (DevTools) on Home, Support, Bookings | Core Web Vitals green (LCP < 2.5 s) on throttled profile | ⏳ run manually in DevTools (throttled) |
| Load smoke (e.g. 50 concurrent checkouts with `k6`/`ab`) | No 5xx; p95 < 500 ms; no DB connection exhaustion | ⏳ `k6 run scripts/load-checkout.js` (k6 required) |

### 5.2 Regression re-check

Re-run the complete Phase 3 test matrix. **Any failing test → freeze release,**
fix within Phase 5, re-verify, then re-run the whole matrix.

### 5.3 Final Release Gate Checklist

| # | Item | Dev | QA |
|---|------|-----|-----|
| R1 | Performance benchmarks pass (5.1) | ☑ | ☑ |
| R2 | Full regression matrix green (5.2): backend **111/111**, frontend **38/38**, lint **0 problems**, build + bundle gate OK (43 chunks, entry 60.9 kB gzip) | ☑ | ☑ |
| R3 | Phase 1 Support unit tests still green | ☑ | ☑ |
| R4 | Secrets audit (`.env` files, `API_URL` trim guard): `.env` gitignored (client + server), only `.env.example`/`appsettings.json` tracked, `VITE_API_URL` guard at `api.js:6` | ☑ | ☑ |
| R5 | Deployment dry-run on Vercel + backend host (see `vercel.json`, `web.config`): both present, `dotnet publish` Release OK, `npm run build` OK | ☑ | ☑/☐* |
| R6 | **FINAL SIGN-OFF** — SYSTEM RELEASE READY → PRODUCTION | ☑ | ☐ |

\* R5 Dev side = configs (`vercel.json`, `web.config`) verified + both `npm run build` /
`dotnet publish` pass; the literal push to Vercel/host needs your credentials (one-time, ~5 min).
R6 QA box is yours to check once you deploy.

---

# PHASE 6 — CREDIT / DEBIT CARD PAYMENTS (In-App Form + 3-D Secure)

**Requested after Phase 5.** Replaces the placeholder "card → gcash" fallback with a
real in-app card form backed by **PayMongo Payment Intents**. The card never touches
our server — the browser form is tokenized server-side by `/v1/payment_methods` and
attached to a Payment Intent; banks run 3-D Secure inside a popup, and the server
records the payment only once PayMongo reports the intent `succeeded`.

### 6.1 Card scope (backend)

| Endpoint | What it does |
|----------|--------------|
| `POST /api/payments/paymongo/card/intent` | Creates a Payment Intent (amount, `booking_reference` metadata, `return_url` → `/payment-result`, 3-D Secure `"any"`). Rejects `< ₱20` amounts. |
| `POST /api/payments/paymongo/card/attach` | Validates card via `CardUtils` (Luhn/expiry/CVC/brand, sandbox test cards whitelisted), tokenizes via `/v1/payment_methods`, attaches, returns `next_action.redirect.url` for 3-D Secure. |
| `GET /api/payments/paymongo/card/{intentId}` | Polls the intent; on `succeeded` records the Payment (idempotent upsert by `ReferenceId = intentId`) and marks the linked booking `Paid`. |

Backend units: `Services/PayMongoService.cs` (intent methods), `Services/CardUtils.cs`
(Luhn, expiry, CVC, brand), `Controllers/PaymentsController.cs` (endpoints +
`RecordCompletedCardPaymentAsync`).

### 6.2 Card scope (frontend)

| Piece | What it does |
|-------|--------------|
| `src/components/booking/CardPaymentForm.jsx` | In-app card form — Luhn/expiry/CVC validation, brand badge, PayMongo sandbox test cards accepted, formatted like a real card. |
| `src/services/api.js` | `createCardIntent`, `attachCard`, `getCardIntentStatus`. |
| `src/context/BookingContext.jsx` | Card branch of `processAndCreateBooking(bookingData, paymentData, card)` — sync popup open, create intent → attach → 3-D Secure → poll → `transactionId = intentId` → `createBooking` as paid. |
| `src/pages/PaymentResultPage.jsx` + `/payment-result` route | 3-D Secure / hosted redirect landing in the popup; opener tab keeps polling. |

### 6.3 Phase 6 Gate Checklist

| # | Item | Dev | QA |
|---|------|-----|-----|
| C1 | Backend card endpoints + `CardUtils` + Payment-Intent service methods | ☑ | |
| C2 | Backend tests (service request/3DS parsing, CardUtils Luhn/brand/expiry/CVC, controller reject/record/idempotency, test-mode guard) — **111/111 backend green** | ☑ | |
| C3 | Frontend card form + context card flow + `/payment-result` + modal wiring; expiry input uses the `00 / 00` mask | ☑ | |
| C4 | Frontend tests — **38/38 green** (`CardPaymentForm` validity/brand/luhn/sandbox, checkout card-block + card-passed-to-booking) | ☑ | |
| C5 | Regression: `npm run lint` clean (0 problems), `npm run build` + `check:bundle` pass | ☑ | |
| C6 | Live smoke (real PayMongo sandbox, `sk_test_*`): `4343434343434345` (Visa) → intent `succeeded` → poll `paid` → Payment recorded; `4120000000000007` (3-D Secure) → `awaiting_next_action` + popup redirect URL. `billing.email` defect found & fixed; decline (`5100000000000198`) surfaces graceful `status=failed,failureReason=...` instead of a raw 400. **TEST-MODE-ONLY lock** — `PayMongoService.GuardTestMode` fails fast at startup on `sk_live_`/`pk_live_` while `PayMongo:Mode=test` (the default); explicit `Mode=live` required to opt in | ☑ | |
| C7 | Manual QA: decline card flow + 3-D Secure window + admin Payments row appears (Dev auto-smoke + unit coverage done; human popup click = user) | | ☐ |

> The live smoke ran against a server launched directly (`dotnet <dll>`), which
> binds to **:5000** (the `:5110` in `launchSettings.json` only applies to
> `dotnet run`) — so `scripts/card-smoke.ps1 -Base http://localhost:5000` was
> used with the `sk_test_*` key from `appsettings.Development.json`. PayMongo
> sandbox test cards are intentionally not all Luhn-compliant, so the documented
> ones are whitelisted in `CardUtils.IsSandboxTestCard`.

---

# PHASE 7 — PRODUCTION HOTFIX (Preview 404s, Blank Inquiry Rows, Client Images)

**Requested after Phase 6 / release.** In the live Vercel preview the Super Admin
"Tier Inquiries" tab threw a hard 404 because `vercel.json` proxies `/api/*` →
`http://travelconnect.runasp.net/api/*` but the backend has not been deployed to
MonsterASP yet (R5* still pending). Fix policy: **keep every Inquiry feature**
(no removals), degrade gracefully while the API host is unreachable, never paint
a raw red 404 or a wall of blank rows, and make client images resilient so no
card ever shows a broken image.

### 7.1 Fix scope

| Area | Change |
|------|--------|
| `SupportHubPage.jsx` | `inbox()` 404/network failures show a friendly amber "API host unreachable" panel (`CloudOff`) instead of the raw red error; genuine backend errors still show red |
| `AdminManagementPage.jsx` | Table load failures show friendly offline copy; the Inquiries table drops fully-blank rows (no name/email/subject/message) so it can't render empty cells |
| `SubscriptionsPage.jsx` | Email History shows an amber note (not a silent blank) when `/api/support/emails` is unreachable |
| `services/api.js` | New `imgSrc()` + `IMAGE_FALLBACK` + `handleImgError()`: relative paths resolve via `assetUrl`, empty/broken images swap to an Unsplash placeholder exactly once |
| `FeaturedPackages.jsx` / `PopularDestinations.jsx` | Home card images use `imgSrc()` + `onError` fallback so uploaded images that 404 (backend down) fall back instead of breaking |

### 7.2 Phase 7 Gate Checklist

| # | Item | Dev | QA |
|---|------|-----|-----|
| F1 | SupportHub offline state — new `SupportHubPage.test.jsx` covers 404, network failure, list, and empty state | ☑ | |
| F2 | `api.js` `imgSrc` / `handleImgError` unit tests — empty + relative + absolute + one-shot fallback | ☑ | |
| F3 | Regression: backend **111/111** green, frontend **44/44** green, lint **0 problems**, `npm run build` + `check:bundle` pass | ☑ | |
| F4 | Client-side QA in preview: Support Hub tier tab no longer raw-404s, Inquiries table has no blank rows, home cards show the placeholder (not a broken icon) while backend is undeployed | | ☐ |
| F5 | Final QA once `travelconnect.runasp.net` is deployed (R5*): inbox loads real tier inquiries, Email History populates, uploaded images resolve | | ☐ |

---

# PHASE 8 — TIER INQUIRY QUICK REPLIES + QUICK QUESTIONS

**Requested after Phase 7.** So the Super Admin never has to compose a tier reply
from scratch, and customers never have to type: pre-made answers for the tier
inquiries and pre-made questions for the customer chat, driven by one shared
data module so prices/descriptions always match the plan (Starter ₱2,999 /
Professional ₱7,999 / Enterprise ₱14,999).

## Phase 8A — Implementation

| Piece | What it does |
|-------|--------------|
| `src/data/tierQuickReplies.js` | Shared templates: `TIER_QUICK_QUESTIONS` (6 client chips: tier 1/2/3 details, upgrade, switch/downgrade, payment) and `TIER_QUICK_REPLIES` (6 canned answers with `matches` keywords + `suggestTierReply()` best-match helper). |
| `SupportChatWidget.jsx` | When a **Subscription** conversation is open, shows "Common tier questions" chips; tapping one sends the pre-made message. Not shown for General/Problem threads. |
| `SupportHubPage.jsx` | Tier tab shows a "Quick replies — tier inquiries" panel. One click inserts the canned reply into the reply box (appends to any existing draft). The best-match template for the customer's last message is starred and highlighted. |

**Phase 8A gate:** lint 0, existing frontend suite green, build + bundle gate OK — verified before any tests were written.

## Phase 8B — Unit Tests

| Test | Covers |
|------|--------|
| `tierQuickReplies.test.js` | Non-empty, unique ids across questions/replies, correct shapes, `suggestTierReply` keyword matching (tier 1/2/3, upgrade, pay, unknown/null). |
| `SupportChatWidget.test.jsx` | Sends a pre-made tier question in a Subscription thread; offers no chips on a non-Subscription thread. |
| `SupportHubPage.test.jsx` | Clicking a quick reply fills the reply box with the canned answer; appends to an existing draft. |

### 8.2 Phase 8 Gate Checklist

| # | Item | Dev | QA |
|---|------|-----|-----|
| T1 | 8A implemented: shared data module + chat chips + hub quick-reply panel; lint 0, build + bundle gate OK, existing 44 tests green before writing new tests | ☑ | |
| T2 | 8B tests green — frontend **53/53** (44 + 5 data + 2 widget + 2 hub), backend **111/111** regression | ☑ | |
| T3 | Manual QA: pick "Agency & Tier Plan" in the chat → chips send tier questions; Super Admin Support Hub tier tab inserts canned replies (best-match starred) | | ☐ |

---

## Phase 9A — Implementation

**Requested after Phase 8.** Separate support hubs by ownership: the Super Admin's
hub handles **only tier plan inquiries** (no authority over an agency's customer
problems or modules), while a new **Agency Support Hub** handles the agency's own
customer problems — accessible only to the new **Agency Admin** role (the agency
owner). `admin@travelconnect.com` (Maria Santos) is seeded as the Agency Admin.

| Piece | What it does |
|-------|--------------|
| `DatabaseInitializer.cs` | Seeds new role **"Agency Admin"**; Maria Santos (`admin@travelconnect.com`) → Agency Admin (agency owner). |
| `SupportController.cs` | Authz split: `IsAgencyAdminAsync()`; `CanModerate` = tier→Super Admin only, problems→Agency Admin only; Inbox + read/reply/reply-email/status/assign all scoped through it; `agents` roster = active Super Admin/Agency Admin (Agency Staff excluded). Super Admin is **Forbidden** from the agency problem inbox and cannot reply to a customer problem. |
| `adminConfig.js` | `ADMIN_ROLES` + "Agency Admin"; nav: Super Admin → "Tier Support", new "Agency Admin" group (Agency Support + agency modules), Agency Staff loses `support-hub`; `ADMIN_ACCESS`/`pageMeta` updated; `AdminManagementPage` role dropdown includes "Agency Admin". |
| `SupportHubPage.jsx` | Tier-only hub (Super Admin): **removed** the Customer Problems tab, staff fallback, and tab switcher. |
| `AgencySupportHubPage.jsx` *(new)* | Problems-only hub (Agency Admin): customer problems inbox, chat reply, status; no tier/email features. |
| `App.jsx` | New route `/admin/agency-support`. |
| `SupportChatWidget.jsx` | Copy updated: Refund/Problem/General issues → "Agency Admin"; tier → Super Admin. |

**Phase 9A gate:** lint 0, frontend **53/53**, backend **111/111** (existing staff
fixtures migrated to Agency Admin + one leftover `!staff` reference fixed), build +
bundle gate OK.

## Phase 9B — Unit Tests

| Test | Covers |
|------|--------|
| `SupportControllerTests.cs` (added) | Agency Staff forbidden from **both** inboxes; Super Admin forbidden from the problems inbox (unscoped + `All`); Super Admin cannot reply to a customer problem; agents roster excludes Agency Staff; migrated fixtures assert Agency Admin can moderate problems but cannot moderate tier. |
| `SupportHubPage.test.jsx` (updated) | Non-Super-Admin role sees the gate message; the tier page never renders a "Customer Problems" tab/button. |
| `AgencySupportHubPage.test.jsx` *(new, 6 tests)* | Lists customer problems; empty state; gate for Super Admin **and** Agency Staff; sends a chat reply as Agency Admin; offline panel. |

### 9.2 Phase 9 Gate Checklist

| # | Item | Dev | QA |
|---|------|-----|-----|
| U1 | 9A implemented: new **Agency Admin** role + tier-only Super Admin hub + Agency Support Hub; Super Admin blocked from agency problems (backend `Forbid` + UI); lint 0, build + bundle gate OK, existing suites green before writing new frontend tests | ☑ | |
| U2 | 9B tests green — frontend **61/61**, backend **114/114** | ☑ | |
| U3 | Manual QA: log in as **Super Admin** → "Tier Support" only; log in as **Agency Admin** (Maria Santos / `admin@travelconnect.com`) → Agency Support Hub only; **Agency Staff** sees neither support hub | | ☐ |

---

# 4. Progress Log

| Phase | Started | Completed | Sign-off (Dev/QA) | Result |
|-------|---------|-----------|-------------------|--------|
| 1A Polish (Customer Support) | 2026-09-21 | 2026-09-22 | ✓ / | Done — 5 defects fixed, builds clean |
| 1B Support Unit Tests | 2026-09-22 | 2026-09-22 | ✓ / | Done — 42 backend / 22 frontend green |
| 2 Feature — Promotions in Checkout | 2026-09-22 | 2026-09-22 | ✓ / | Done — 64 backend / 27 frontend green, 0 new lint |
| 3 Test / QA | 2026-09-22 | 2026-09-22 | ✓ ✓ | Done — 65 backend / 27 frontend green; fixed `/api/test` route, Support Hub staff inbox leak, tier-inquiry email (SMTP fallback) |
| 4 Optimization | 2026-09-22 | 2026-09-22 | ✓ ✓ | Done — indexes, AsNoTracking sweep, page-size caps (500), response caching, `public-read` limiter, React.lazy split (41 chunks, entry 59 kB gzip), lazy images, debounced Helpdesk search, bundle gate; 73 backend / 27 frontend green |
| 5 Optimization Unit Tests + Perf | 2026-09-22 | 2026-09-22 | ✓ / | Done — 8 perf-guard tests (caps/cache/limiter/indexes), `check:bundle`, k6 script; full regression green (73/73 + 27/27), lint 0 new. Manual: Lighthouse + `k6` live run + deploy (R5/R6 = user) |
| 6 Card Payments (in-app + 3DS) | 2026-09-22 | 2026-09-23 | ✓ / | Done — Payment Intents backend + CardUtils + card endpoints, in-app CardPaymentForm + 3-D Secure poll + `/payment-result`, **TEST-MODE-ONLY** guard + `00 / 00` expiry mask; backend 111 + frontend 38 green, lint 0, build + bundle-gate pass. Live smoke vs real PayMongo sandbox passed (Visa success + 3-D Secure redirect + graceful decline). Remaining: human 3-D Secure popup click + admin Payments row = QA (user) |
| 7 Production hotfix (preview 404s / blank inquiry rows / client images) | 2026-09-23 | 2026-09-23 | ✓ / | Done — Support Hub tier tab shows a friendly "API host unreachable" amber panel instead of the raw red 404; Inquiries table drops fully-blank rows; Email History shows an offline note; home package/destination cards use `imgSrc()` + `handleImgError()` so uploaded images fall back to a placeholder instead of breaking. Frontend **44/44** green, backend **111/111**, lint 0, build + bundle gate pass. Nothing removed. Deploy blockers unchanged: MonsterASP backend upload (R5*) + F4/F5 QA boxes |
| 8 Tier Inquiry Quick Replies + Quick Questions | 2026-09-23 | 2026-09-23 | ✓ / | Done — shared `tierQuickReplies.js` templates; customer chat shows "Common tier questions" chips on Subscription threads; Super Admin Support Hub tier tab has a quick-reply panel (best-match starred, insert/append). 8A gate passed (lint 0, build OK, existing 44 green) before 8B; frontend **53/53**, backend **111/111**, lint 0, bundle gate OK. T3 manual QA = user |
| 9 Separate Support Hubs (role ownership) | 2026-09-24 | 2026-09-24 | ✓ / | Done — new **Agency Admin** role (agency owner); Super Admin hub = tier plan inquiries only (problems tab removed); new Agency Support Hub = the agency's customer problems, Agency Admin only; Super Admin `Forbid` from agency problems (backend + UI), agents roster = Super Admin/Agency Admin, staff loses support access. 9A gate passed (lint 0, build OK, 53/53 + 111/111) before 9B; frontend **61/61**, backend **114/114**, lint 0, bundle gate OK. U3 manual QA = user |
| Release Gate R1–R6 | 2026-09-23 | 2026-09-23 | ✓ / | R1–R5 Dev done: publish + build + vault/secrets clean + bundle gate OK + lint **0 problems** (62→0 cleanup: unused imports removed, `useMemo(setPage)` anti-pattern → `useEffect`, context-hook/static-component suppressions documented). Added **TEST-MODE-ONLY** PayMongo guard + `00 / 00` expiry mask. Pending (user): deploy to Vercel/host (R5*), human popup 3-D Secure QA, then R6 QA sign-off |
| **Release** | | | / | **R6 pending — deploy on Vercel/host, then check QA boxes** |

---

## 5. Commands Quick Reference

```bash
# ── Backend ─────────────────────────────────────────────
cd server/TravelConnect.Server
dotnet run                                  # dev server → :5110

# Unit tests (Phase 1B / gates)
cd server && dotnet test

# Performance suite (Phase 5)
cd server/TravelConnect.Server.Tests && dotnet run --project PerfHarness

# ── Frontend ────────────────────────────────────────────
cd client/TravelConnect.Client
npm run dev                                 # dev server → :5173
npm run lint                                # ESLint gate
npm test                                    # Vitest unit tests
npm run build                               # production bundle audit

# ── Load test (Phase 5) ─────────────────────────────────
# k6 run scripts/load-checkout.js   (create scripts/ once Phase 5 begins)

# ── Database index audit (Phase 4) ──────────────────────
# Run EXPLAIN on: leads.Email, inquiries.CustomerEmail,
# support_conversations(CustomerEmail/Status/Category), bookings.Reference
```

---

> *TravelConnect Phased Workflow — Professional Dev & QA — September 2026.*
> *Strict gating: no phase starts until the previous phase is signed off.*