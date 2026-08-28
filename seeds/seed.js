#!/usr/bin/env node

/**
 * Firebase Seeder — TravelConnect Admin Panel
 * Creates 5 admin accounts in Firebase Auth + Firestore
 *
 * Usage:
 *   cd seeds && npm install && npm run seed
 *   npm run seed:reset   (deletes existing users first)
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Load service account key ────────────────────────────────────
const SERVICE_ACCOUNT_PATH = join(__dirname, "serviceAccountKey.json");

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(
    "\x1b[31m%s\x1b[0m",
    "\n❌ serviceAccountKey.json not found in seeds/ folder.\n"
  );
  console.log("To get it:");
  console.log("  1. Go to https://console.firebase.google.com/");
  console.log("  2. Select your project → ⚙ Project Settings → Service Accounts");
  console.log(
    '  3. Click "Generate new private key" → save as seeds/serviceAccountKey.json\n'
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(
  readFileSync(SERVICE_ACCOUNT_PATH, "utf8")
);

// ── Initialize Firebase Admin ───────────────────────────────────
initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();
const db = getFirestore();

// ── Input sanitization (mirrors client-side validation) ─────────

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
  /(--|;|'|"|\\)/,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  /(\bSLEEP\s*\()/i,
  /(\bBENCHMARK\s*\()/i,
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
];

function sanitizeString(input) {
  if (typeof input !== "string") return input;
  return input
    .replace(/\0/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim();
}

function hasInjection(value) {
  if (typeof value !== "string") return false;
  return (
    SQL_INJECTION_PATTERNS.some((p) => p.test(value)) ||
    XSS_PATTERNS.some((p) => p.test(value))
  );
}

function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  if (email.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (hasInjection(email)) return false;
  return true;
}

function validatePassword(pw) {
  if (!pw || typeof pw !== "string") return false;
  if (pw.length < 8) return false;
  if (pw.length > 128) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  return true;
}

// ── Password hashing (SHA-256 + salt for Firestore storage) ────

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(salt + password).digest("hex");
  return `${salt}:${hash}`;
}

// ── Seed accounts ───────────────────────────────────────────────
const ACCOUNTS = [
  {
    email: "superadmin@travelconnect.com",
    password: "SuperAdmin@123",
    displayName: "Juan Dela Cruz",
    role: "Super Admin",
    phone: "+63 917 123 4567",
    department: "Administration",
    avatar: "JC",
  },
  {
    email: "admin@travelconnect.com",
    password: "AgencyAdmin@123",
    displayName: "Maria Santos",
    role: "Agency Staff",
    phone: "+63 918 234 5678",
    department: "Operations",
    avatar: "MS",
  },
  {
    email: "finance@travelconnect.com",
    password: "FinanceStaff@123",
    displayName: "Pedro Reyes",
    role: "Finance Staff",
    phone: "+63 919 345 6789",
    department: "Finance",
    avatar: "PR",
  },
  {
    email: "supplier@travelconnect.com",
    password: "Supplier@123",
    displayName: "Ana Garcia",
    role: "Supplier",
    phone: "+63 920 456 7890",
    department: "Supply Chain",
    avatar: "AG",
  },
  {
    email: "customer@travelconnect.com",
    password: "Customer@123",
    displayName: "Carlo Mendoza",
    role: "Customer",
    phone: "+63 921 567 8901",
    department: "N/A",
    avatar: "CM",
  },
];

// ── Helpers ─────────────────────────────────────────────────────
function log(msg) {
  console.log(`\x1b[36m${msg}\x1b[0m`);
}

function success(msg) {
  console.log(`\x1b[32m  ✔ ${msg}\x1b[0m`);
}

function warn(msg) {
  console.log(`\x1b[33m  ⚠ ${msg}\x1b[0m`);
}

function error(msg) {
  console.log(`\x1b[31m  ✘ ${msg}\x1b[0m`);
}

// ── Main ────────────────────────────────────────────────────────
async function seed() {
  const isReset = process.argv.includes("--reset");

  console.log("\n\x1b[1m\x1b[35m");
  console.log("  ╔═══════════════════════════════════════════╗");
  console.log("  ║   TravelConnect Firebase Seeder           ║");
  console.log("  ╚═══════════════════════════════════════════╝");
  console.log("\x1b[0m\n");

  if (isReset) {
    log("🗑️  Reset mode — deleting existing seed users...\n");
    for (const acct of ACCOUNTS) {
      try {
        const user = await auth.getUserByEmail(acct.email);
        await auth.deleteUser(user.uid);
        await db.collection("users").doc(user.uid).delete();
        success(`Deleted ${acct.email}`);
      } catch {
        warn(`${acct.email} not found — skipping`);
      }
    }
    console.log();
  }

  log("🌱 Seeding accounts...\n");

  for (const acct of ACCOUNTS) {
    // ── Validate inputs before writing ──────────────────────
    if (!validateEmail(acct.email)) {
      error(`Invalid email: ${acct.email} — skipping`);
      continue;
    }
    if (!validatePassword(acct.password)) {
      error(`Weak password for ${acct.email} — skipping`);
      continue;
    }
    if (hasInjection(acct.displayName) || hasInjection(acct.department)) {
      error(`Injection detected in data for ${acct.email} — skipping`);
      continue;
    }

    // Sanitize string fields
    for (const key of Object.keys(acct)) {
      if (typeof acct[key] === "string") {
        acct[key] = sanitizeString(acct[key]);
      }
    }

    let uid;
    try {
      const userRecord = await auth.createUser({
        email: acct.email,
        password: acct.password,
        displayName: acct.displayName,
        phoneNumber: acct.phone,
        emailVerified: true,
      });
      uid = userRecord.uid;
      success(`Created auth user: ${acct.email} (${uid})`);
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        const existing = await auth.getUserByEmail(acct.email);
        uid = existing.uid;
        warn(`Auth user already exists: ${acct.email} — reusing UID`);
      } else {
        error(`Failed to create ${acct.email}: ${err.message}`);
        continue;
      }
    }

    // Set custom claims (used for role-based access in frontend)
    await auth.setCustomUserClaims(uid, { role: acct.role });

    // Hash password for Firestore storage (backup verification)
    const passwordHash = hashPassword(acct.password);

    // Write profile to Firestore with validation passed
    await db.collection("users").doc(uid).set(
      {
        email: acct.email,
        displayName: acct.displayName,
        role: acct.role,
        phone: acct.phone,
        department: acct.department,
        avatar: acct.avatar,
        status: "Active",
        passwordHash, // hashed backup — never store plaintext
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    success(`Firestore: users/${uid}`);
  }

  // Summary table
  console.log("\n");
  log("📋 Account Summary:");
  console.log("┌────────────────────────────┬───────────────────────────┬──────────────────┐");
  console.log("│ Email                      │ Password                  │ Role             │");
  console.log("├────────────────────────────┼───────────────────────────┼──────────────────┤");
  for (const acct of ACCOUNTS) {
    const email = acct.email.padEnd(28);
    const pass = acct.password.padEnd(27);
    const role = acct.role.padEnd(16);
    console.log(`│ ${email} │ ${pass} │ ${role} │`);
  }
  console.log("└────────────────────────────┴───────────────────────────┴──────────────────┘");

  log("\n✅ Done! Firebase Auth + Firestore seeded successfully.\n");
  log("📌 Next steps:");
  console.log("   1. Go to Firebase Console → Authentication → Sign-in method");
  console.log("   2. Enable 'Email/Password' provider");
  console.log("   3. Run your app and sign in with any account above\n");
}

seed().catch((err) => {
  error(`Seeder failed: ${err.message}`);
  process.exit(1);
});
