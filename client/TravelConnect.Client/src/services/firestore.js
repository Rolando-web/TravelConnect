// ════════════════════════════════════════════════════════════════
//  TravelConnect — Secure Firestore Service
//  Validates, sanitizes, and encrypts data before writes
// ════════════════════════════════════════════════════════════════

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { validate, sanitizeObject, validators } from "../utils/validation";
import { encryptFields, decryptFields, SENSITIVE_FIELDS } from "../utils/encryption";

// ── Collection schemas ─────────────────────────────────────────

const SCHEMAS = {
  users: {
    email: validators.email,
    displayName: validators.displayName,
    phone: validators.phone,
    role: validators.role,
    status: validators.status,
  },
  customers: {
    email: validators.email,
    displayName: validators.displayName,
    phone: validators.phone,
  },
  suppliers: {
    companyName: validators.name,
    contactName: validators.name,
    contactEmail: validators.email,
    contactPhone: validators.phone,
  },
  packages: {
    name: validators.nonEmpty,
    price: validators.amount,
    duration: validators.nonEmpty,
  },
  bookings: {
    customerName: validators.name,
    customerEmail: validators.email,
    destination: validators.nonEmpty,
    guests: validators.positiveInt,
    total: validators.amount,
  },
  payments: {
    customerName: validators.name,
    customerEmail: validators.email,
    amount: validators.amount,
    method: validators.nonEmpty,
  },
  leads: {
    name: validators.name,
    email: validators.email,
    interest: validators.nonEmpty,
  },
  promotions: {
    code: validators.slug,
    name: validators.nonEmpty,
    discount: validators.amount,
  },
  inquiries: {
    subject: validators.nonEmpty,
    message: (v) => validators.freeText(v, 2000),
  },
};

// ── Logging ────────────────────────────────────────────────────

async function auditLog(action, collectionName, docId, data, userId) {
  try {
    await addDoc(collection(db, "auditLog"), {
      action,
      collection: collectionName,
      docId,
      userId: userId || "system",
      timestamp: serverTimestamp(),
      // Don't log full data — just field names for audit
      fields: data ? Object.keys(data) : [],
    });
  } catch {
    // Audit log failure should never block the main operation
  }
}

// ── Secure CRUD operations ─────────────────────────────────────

/**
 * Creates a document with validation, sanitization, and optional encryption.
 * @param {string} collectionName - Firestore collection name
 * @param {object} data - Document data
 * @param {object} options - { encrypt: string[] }
 * @returns {Promise<{success: boolean, id?: string, errors?: string[]}>}
 */
export async function secureCreate(collectionName, data, options = {}) {
  const schema = SCHEMAS[collectionName];
  if (schema) {
    const result = validate(data, schema);
    if (!result.valid) {
      return {
        success: false,
        errors: result.errors.map((e) => `${e.field}: ${e.error}`),
      };
    }
    data = result.clean;
  } else {
    data = sanitizeObject(data);
  }

  // Encrypt sensitive fields
  const fieldsToEncrypt = options.encrypt || SENSITIVE_FIELDS[collectionName] || [];
  if (fieldsToEncrypt.length > 0) {
    data = await encryptFields(data, fieldsToEncrypt);
  }

  // Add timestamps
  const now = new Date().toISOString();
  data.createdAt = now;
  data.updatedAt = now;

  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    await auditLog("create", collectionName, docRef.id, data);
    return { success: true, id: docRef.id };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

/**
 * Creates/overwrites a document by ID with validation.
 */
export async function secureSet(collectionName, docId, data, options = {}) {
  const schema = SCHEMAS[collectionName];
  if (schema) {
    const result = validate(data, schema);
    if (!result.valid) {
      return {
        success: false,
        errors: result.errors.map((e) => `${e.field}: ${e.error}`),
      };
    }
    data = result.clean;
  } else {
    data = sanitizeObject(data);
  }

  const fieldsToEncrypt = options.encrypt || SENSITIVE_FIELDS[collectionName] || [];
  if (fieldsToEncrypt.length > 0) {
    data = await encryptFields(data, fieldsToEncrypt);
  }

  const now = new Date().toISOString();
  data.createdAt = data.createdAt || now;
  data.updatedAt = now;

  try {
    await setDoc(doc(db, collectionName, docId), data);
    await auditLog("set", collectionName, docId, data);
    return { success: true, id: docId };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

/**
 * Updates a document with partial validation.
 */
export async function secureUpdate(collectionName, docId, data, options = {}) {
  const schema = SCHEMAS[collectionName];
  if (schema) {
    const result = validate(data, schema);
    if (!result.valid) {
      return {
        success: false,
        errors: result.errors.map((e) => `${e.field}: ${e.error}`),
      };
    }
    data = result.clean;
  } else {
    data = sanitizeObject(data);
  }

  const fieldsToEncrypt = options.encrypt || SENSITIVE_FIELDS[collectionName] || [];
  if (fieldsToEncrypt.length > 0) {
    data = await encryptFields(data, fieldsToEncrypt);
  }

  data.updatedAt = new Date().toISOString();

  try {
    await updateDoc(doc(db, collectionName, docId), data);
    await auditLog("update", collectionName, docId, data);
    return { success: true };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

/**
 * Reads a single document with optional decryption.
 */
export async function secureGet(collectionName, docId, options = {}) {
  try {
    const snap = await getDoc(doc(db, collectionName, docId));
    if (!snap.exists()) {
      return { success: false, errors: ["Document not found"] };
    }

    let data = { id: snap.id, ...snap.data() };

    // Decrypt sensitive fields
    const fieldsToDecrypt = options.encrypt || SENSITIVE_FIELDS[collectionName] || [];
    if (fieldsToDecrypt.length > 0) {
      data = await decryptFields(data, fieldsToDecrypt);
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

/**
 * Reads multiple documents with optional decryption.
 */
export async function secureGetAll(collectionName, options = {}) {
  try {
    const snap = await getDocs(collection(db, collectionName));
    let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Decrypt sensitive fields
    const fieldsToDecrypt = options.encrypt || SENSITIVE_FIELDS[collectionName] || [];
    if (fieldsToDecrypt.length > 0) {
      docs = await Promise.all(docs.map((d) => decryptFields(d, fieldsToDecrypt)));
    }

    return { success: true, data: docs };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

/**
 * Queries documents with optional filtering.
 */
export async function secureQuery(collectionName, filters = [], options = {}) {
  try {
    let q = collection(db, collectionName);
    const constraints = [];

    for (const f of filters) {
      constraints.push(where(f.field, f.op, f.value));
    }

    if (options.orderByField) {
      constraints.push(orderBy(options.orderByField, options.orderDir || "desc"));
    }
    if (options.limitTo) {
      constraints.push(limit(options.limitTo));
    }

    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }

    const snap = await getDocs(q);
    let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const fieldsToDecrypt = options.encrypt || SENSITIVE_FIELDS[collectionName] || [];
    if (fieldsToDecrypt.length > 0) {
      docs = await Promise.all(docs.map((d) => decryptFields(d, fieldsToDecrypt)));
    }

    return { success: true, data: docs };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}

/**
 * Deletes a document.
 */
export async function secureDelete(collectionName, docId) {
  try {
    await deleteDoc(doc(db, collectionName, docId));
    await auditLog("delete", collectionName, docId);
    return { success: true };
  } catch (err) {
    return { success: false, errors: [err.message] };
  }
}
