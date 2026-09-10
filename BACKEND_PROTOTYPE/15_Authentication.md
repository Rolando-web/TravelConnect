# Section 15 — Authentication & Authorization Screen

> **Figure 15 — Sign-In Modal & Role-Based Access Control**

---

## Screenshot Description

The Sign-In modal and RBAC system:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    ┌─────────────────────────────┐                              │
│    │     ✈️  Sign In to          │      ┌──────────────────┐   │
│    │        TravelConnect        │      │  Admin Sidebar   │   │
│    │                             │      │                  │   │
│    │  ┌───────────────────────┐  │      │  ● Dashboard     │   │
│    │  │ Email                 │  │      │  ● Users         │   │
│    │  └───────────────────────┘  │      │  ● Customers     │   │
│    │  ┌───────────────────────┐  │      │  ● Suppliers     │   │
│    │  │ Password              │  │      │  ● Packages      │   │
│    │  └───────────────────────┘  │      │  ● Bookings      │   │
│    │                             │      │  ● Payments      │   │
│    │  [       Sign In       ]    │      │  ● Leads         │   │
│    │                             │      │  ● Promotions    │   │
│    │  ──── or ────              │      │  ● Inquiries     │   │
│    │                             │      │  ● Flights       │   │
│    │  [🔵 Sign in with Google]  │      │  ● Hotels        │   │
│    │                             │      │  ● Cars          │   │
│    └─────────────────────────────┘      │  ● Activities    │   │
│                                         │  ● Reports       │   │
│    Role Badge After Login:              │  ● Profile       │   │
│    ┌──────────┐                         │  ● Support       │   │
│    │Super Admin│                        │                  │   │
│    └──────────┘                         └──────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Code

**Sign-In Modal:** `client/TravelConnect.Client/src/components/modals/auth/SignInModal.jsx`

**Route Guard:** `client/TravelConnect.Client/src/components/admin/ProtectedRoute.jsx` (33 lines)

**Auth Context:** `client/TravelConnect.Client/src/context/AuthContext.jsx`

**Role Config:** `client/TravelConnect.Client/src/pages/admin/adminConfig.js` (152 lines)

**Firebase Init:** `client/TravelConnect.Client/src/services/firebase.js`

**Firestore Rules:** `firestore.rules` (137 lines)

---

## How to Take Screenshot

1. Open `http://localhost:5173` (homepage)
2. Click "Sign In" button → screenshot the modal
3. Log in as Super Admin → screenshot the admin sidebar showing full navigation
4. Log in as Finance Staff → screenshot showing limited navigation

---

## API/Services Used

| Service | Purpose |
|---------|---------|
| **Firebase Auth** (Email/Password) | Primary authentication method |
| **Firebase Auth** (Google OAuth) | Social login alternative |
| **Firebase Firestore** (`users` collection) | Stores user profiles with role field |
| **AdminConfig** (`adminConfig.js`) | Role definitions, navigation, access permissions |

---

## Algorithms Used

### Role Hierarchy
```
Super Admin > Finance Staff > Agency Staff > Supplier > Customer
```

### RBAC Access Control (`adminConfig.js`)
```javascript
export const ADMIN_ACCESS = {
  "Super Admin": {
    dashboard: true, users: true, customers: true, suppliers: true,
    packages: true, flights: true, hotels: true, cars: true,
    activities: true, destinations: true, promotions: true,
    bookings: true, payments: true, leads: true, inquiries: true,
    reports: true, settings: true, profile: true, support: true
  },
  "Finance Staff": {
    dashboard: true, bookings: true, payments: true,
    reports: true, profile: true
  },
  "Agency Staff": {
    dashboard: true, customers: true, suppliers: true,
    packages: true, destinations: true, bookings: true,
    leads: true, promotions: true, inquiries: true,
    flights: true, hotels: true, cars: true, activities: true,
    profile: true, support: true
  },
  "Supplier": {
    dashboard: true, flights: true, hotels: true,
    cars: true, activities: true, bookings: true,
    profile: true
  }
};
```

### ProtectedRoute Guard
```jsx
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/" replace />;
  if (!ADMIN_ROLES.includes(user.role)) return <Navigate to="/bookings" replace />;

  const pageKey = location.pathname.split("/")[1] || "dashboard";
  const access = ADMIN_ACCESS[user.role] || {};
  if (!(pageKey in access)) return <Navigate to="/admin" replace />;

  return children;
}
```

### Role-Based Navigation
```javascript
export const ROLE_NAV = {
  "Super Admin": [
    ["dashboard", "Dashboard"], ["users", "Users"],
    ["customers", "Customers"], ["suppliers", "Suppliers"],
    ["packages", "Packages"], ["flights", "Flights"],
    ["hotels", "Hotels"], ["cars", "Cars"],
    ["activities", "Activities"], ["destinations", "Destinations"],
    ["promotions", "Promotions"], ["bookings", "Bookings"],
    ["payments", "Payments"], ["leads", "CRM Leads"],
    ["inquiries", "Inquiries"], ["reports", "Reports"],
    ["profile", "Profile"], ["support", "Support"]
  ],
  "Finance Staff": [
    ["dashboard", "Dashboard"], ["bookings", "Bookings"],
    ["payments", "Payments"], ["reports", "Reports"],
    ["profile", "Profile"]
  ],
  // ... other roles
};
```

### Firestore Security Rules (RBAC)
```javascript
// Example: Bookings collection
match /bookings/{docId} {
  allow create: if request.auth != null;
  allow read: if request.auth != null;
  allow update: if isAdmin() || isAgencyStaff();
  allow delete: if isSuperAdmin();
}

function isAdmin() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Super Admin';
}

function isAgencyStaff() {
  let role = get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
  return role == 'Super Admin' || role == 'Agency Staff';
}
```

### Password Hashing (Seed Script)
```javascript
// SHA-256 with 16-byte random salt
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
const stored = `${salt}:${hash}`;
```

---

## Role Navigation Summary

| Role | Accessible Admin Pages |
|------|----------------------|
| **Super Admin** | All 17+ pages (full access) |
| **Agency Staff** | Dashboard, Packages, Destinations, Bookings, Customers, Suppliers, Leads, Promotions, Inquiries, Flights, Hotels, Cars, Activities, Profile, Support |
| **Finance Staff** | Dashboard, Bookings, Payments, Reports, Profile |
| **Supplier** | Dashboard, Flights, Hotels, Cars, Activities, Bookings (read-only), Profile |
