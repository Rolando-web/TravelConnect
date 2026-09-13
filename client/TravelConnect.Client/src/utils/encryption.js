// ════════════════════════════════════════════════════════════════
//  TravelConnect — Field-Level Encryption
//  Encrypts sensitive data before storing in Firestore
//  Uses AES-GCM via the Web Crypto API (browser-native)
// ════════════════════════════════════════════════════════════════

// ── Key derivation ─────────────────────────────────────────────
// The master key is derived from a passphrase + project-specific salt.
// In production, store ENCRYPTION_KEY in a secrets manager, not .env.

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;
const SALT = import.meta.env.VITE_ENCRYPTION_SALT || "travelconnect-v1";

let derivedKey = null;
let keyDisabled = false;
let keyWarned = false;
let saltWarned = false;

/**
 * Derives an AES-GCM key from the master passphrase using PBKDF2.
 * Returns null (and warns) when VITE_ENCRYPTION_KEY is missing so callers
 * fall back to plaintext instead of silently encrypting with "undefined".
 */
async function getDerivedKey() {
  if (derivedKey) return derivedKey;
  if (keyDisabled) return null;

  if (!ENCRYPTION_KEY || typeof ENCRYPTION_KEY !== "string" || ENCRYPTION_KEY.length < 8) {
    keyDisabled = true;
    if (!keyWarned) {
      keyWarned = true;
      console.warn(
        "Field-level encryption is DISABLED because VITE_ENCRYPTION_KEY is not set. " +
          "Sensitive fields will be stored as plaintext. Set a strong passphrase " +
          "in .env to enable encryption."
      );
    }
    return null;
  }

  if (SALT === "travelconnect-v1" && !saltWarned) {
    saltWarned = true;
    console.warn(
      "Using the default static encryption salt. In production, set an " +
        "app-specific VITE_ENCRYPTION_SALT and re-encrypt existing data."
    );
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return derivedKey;
}

// ── Core encrypt / decrypt ─────────────────────────────────────

/**
 * Encrypts a plaintext string → returns "iv:ciphertext" (base64).
 */
export async function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== "string") return plaintext;

  const key = await getDerivedKey();
  if (!key) return plaintext; // encryption disabled — store plaintext

  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  // Pack IV + ciphertext into a single base64 string
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts "iv:ciphertext" (base64) → plaintext string.
 */
export async function decrypt(encoded) {
  if (!encoded || typeof encoded !== "string") return encoded;

  try {
    const key = await getDerivedKey();
    const decoder = new TextDecoder();

    const combined = new Uint8Array(
      atob(encoded)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return decoder.decode(plaintext);
  } catch {
    console.warn("Decryption failed — data may not be encrypted");
    return encoded;
  }
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Checks if a value appears to be encrypted (base64 format).
 */
export function isEncrypted(value) {
  if (!value || typeof value !== "string") return false;
  try {
    return atob(value).length > 12; // at least IV + some data
  } catch {
    return false;
  }
}

/**
 * Encrypts specific fields in an object.
 * Fields not in the list are left untouched. Already-encrypted values are
 * passed through so a read→modify→write cycle never double-encrypts.
 */
export async function encryptFields(data, fields) {
  const result = { ...data };
  for (const field of fields) {
    if (result[field] && typeof result[field] === "string" && !isEncrypted(result[field])) {
      result[field] = await encrypt(result[field]);
    }
  }
  return result;
}

/**
 * Decrypts specific fields in an object.
 */
export async function decryptFields(data, fields) {
  const result = { ...data };
  for (const field of fields) {
    if (result[field] && isEncrypted(result[field])) {
      result[field] = await decrypt(result[field]);
    }
  }
  return result;
}

/**
 * Batch encrypt an array of objects.
 */
export async function encryptCollection(docs, fields) {
  return Promise.all(docs.map((doc) => encryptFields(doc, fields)));
}

/**
 * Batch decrypt an array of objects.
 */
export async function decryptCollection(docs, fields) {
  return Promise.all(docs.map((doc) => decryptFields(doc, fields)));
}

// ── Pre-defined field sets for common collections ──────────────

export const SENSITIVE_FIELDS = {
  users: ["email", "phone", "displayName"],
  customers: ["email", "phone", "displayName"],
  suppliers: ["contactEmail", "contactPhone", "contactName"],
  bookings: ["customerName", "customerEmail", "customerPhone"],
  payments: ["customerName", "customerEmail", "cardLast4"],
  leads: ["email", "phone"],
  inquiries: ["customerEmail", "message"],
};
