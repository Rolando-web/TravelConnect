# TravelConnect — Firebase Seeder

Seeds 5 admin accounts into Firebase Auth + Firestore.

## Setup (one-time)

1. Download your service account key from Firebase Console:

   - Go to https://console.firebase.google.com/
   - Select **travelconnect-d89ce** → ⚙ **Project Settings** → **Service Accounts**
   - Click **"Generate new private key"**
   - Save the file as `seeds/serviceAccountKey.json`

2. Install dependencies:

   ```bash
   cd seeds
   npm install
   ```

## Seed accounts

| Email                        | Password              | Role           |
| ---------------------------- | --------------------- | -------------- |
| superadmin@travelconnect.com | SuperAdmin@123        | Super Admin    |
| admin@travelconnect.com      | AgencyAdmin@123       | Agency Staff   |
| finance@travelconnect.com    | FinanceStaff@123      | Finance Staff  |
| supplier@travelconnect.com   | Supplier@123          | Supplier       |
| customer@travelconnect.com   | Customer@123          | Customer       |

## Run

```bash
cd seeds
npm run seed
```

To reset and re-seed (deletes existing users first):

```bash
npm run seed:reset
```

## What it does

1. Creates a Firebase Auth user for each account
2. Sets a custom `role` claim on each user
3. Writes a profile document to the `users` Firestore collection

After seeding, enable **Email/Password** sign-in in Firebase Console → Authentication → Sign-in method.
