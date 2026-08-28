// ════════════════════════════════════════════════════════════════
//  TravelConnect — Input Validation & Sanitization
//  Defense layer against injection, XSS, and malformed data
// ════════════════════════════════════════════════════════════════

// ── Dangerous patterns ─────────────────────────────────────────
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
  /(--|;|'|"|\\)/,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  /(\b(OR|AND)\b\s+['"].*['"]\s*=\s*['"].*['"])/i,
  /(\bSLEEP\s*\()/i,
  /(\bBENCHMARK\s*\()/i,
  /(\bLOAD_FILE\s*\()/i,
  /(\bINTO\s+(OUTFILE|DUMPFILE)\b)/i,
];

const NOSQL_INJECTION_PATTERNS = [
  /\$where/i,
  /\$regex/i,
  /\$gt|\$gte|\$lt|\$lte/i,
  /\$ne/i,
  /\$in|\$nin/i,
  /\$exists/i,
  /\$elemMatch/i,
  /function\s*\(/,
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /expression\s*\(/gi,
  /<iframe\b/gi,
  /<object\b/gi,
  /<embed\b/gi,
  /<form\b/gi,
];

// ── Core sanitization ──────────────────────────────────────────

/**
 * Strips potentially dangerous characters from a string.
 * Removes HTML tags, null bytes, and control characters.
 */
export function sanitizeString(input) {
  if (typeof input !== "string") return input;
  return input
    .replace(/\0/g, "")                           // null bytes
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // control chars except \n,\r,\t
    .replace(/</g, "&lt;")                         // HTML encode angle brackets
    .replace(/>/g, "&gt;")
    .trim();
}

/**
 * Sanitizes an object's string fields recursively.
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const clean = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      clean[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeObject(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

// ── Detection functions ────────────────────────────────────────

export function hasSqlInjection(value) {
  if (typeof value !== "string") return false;
  return SQL_INJECTION_PATTERNS.some((p) => p.test(value));
}

export function hasNoSqlInjection(value) {
  if (typeof value !== "string") return false;
  return NOSQL_INJECTION_PATTERNS.some((p) => p.test(value));
}

export function hasXss(value) {
  if (typeof value !== "string") return false;
  return XSS_PATTERNS.some((p) => p.test(value));
}

export function hasPathTraversal(value) {
  if (typeof value !== "string") return false;
  return /\.\.\//.test(value) || /\.\.\\/.test(value);
}

export function hasInjection(value) {
  return (
    hasSqlInjection(value) ||
    hasNoSqlInjection(value) ||
    hasXss(value) ||
    hasPathTraversal(value)
  );
}

// ── Field validators ───────────────────────────────────────────

export const validators = {
  email(value) {
    if (typeof value !== "string") return "Email must be a string";
    if (value.length > 254) return "Email too long";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email format";
    if (hasInjection(value)) return "Email contains invalid characters";
    return null;
  },

  password(value) {
    if (typeof value !== "string") return "Password must be a string";
    if (value.length < 8) return "Password must be at least 8 characters";
    if (value.length > 128) return "Password too long";
    if (!/[A-Z]/.test(value)) return "Password needs an uppercase letter";
    if (!/[a-z]/.test(value)) return "Password needs a lowercase letter";
    if (!/[0-9]/.test(value)) return "Password needs a number";
    return null;
  },

  phone(value) {
    if (typeof value !== "string") return "Phone must be a string";
    if (!/^\+?[0-9\s\-()]{7,20}$/.test(value)) return "Invalid phone number";
    return null;
  },

  name(value) {
    if (typeof value !== "string") return "Name must be a string";
    if (value.length < 1) return "Name is required";
    if (value.length > 100) return "Name too long";
    if (hasInjection(value)) return "Name contains invalid characters";
    return null;
  },

  displayName(value) {
    if (typeof value !== "string") return "Display name must be a string";
    if (value.length < 1) return "Display name is required";
    if (value.length > 100) return "Display name too long";
    if (hasInjection(value)) return "Display name contains invalid characters";
    return null;
  },

  role(value) {
    const valid = ["Super Admin", "Agency Staff", "Finance Staff", "Supplier", "Customer"];
    if (!valid.includes(value)) return `Role must be one of: ${valid.join(", ")}`;
    return null;
  },

  status(value) {
    const valid = ["Active", "Inactive", "Suspended", "Pending", "Review"];
    if (!valid.includes(value)) return `Status must be one of: ${valid.join(", ")}`;
    return null;
  },

  amount(value) {
    if (typeof value !== "number") return "Amount must be a number";
    if (value <= 0) return "Amount must be positive";
    if (value > 10_000_000) return "Amount exceeds maximum";
    return null;
  },

  positiveInt(value) {
    if (!Number.isInteger(value)) return "Must be a whole number";
    if (value <= 0) return "Must be positive";
    return null;
  },

  freeText(value, maxLen = 1000) {
    if (typeof value !== "string") return "Text must be a string";
    if (value.length > maxLen) return `Text exceeds ${maxLen} characters`;
    if (hasXss(value)) return "Text contains disallowed HTML";
    return null;
  },

  nonEmpty(value) {
    if (typeof value !== "string" || value.trim().length === 0) return "Field is required";
    return null;
  },

  slug(value) {
    if (typeof value !== "string") return "Slug must be a string";
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) return "Invalid slug format";
    return null;
  },

  date(value) {
    if (isNaN(Date.parse(value))) return "Invalid date";
    return null;
  },
};

// ── Validate an object against a schema ────────────────────────

/**
 * Validates data against a schema definition.
 * Schema: { fieldName: validatorFn }
 * Returns { valid: true, data } or { valid: false, errors: [...] }
 */
export function validate(data, schema) {
  const errors = [];
  const clean = sanitizeObject(data);

  for (const [field, validateFn] of Object.entries(schema)) {
    const error = validateFn(clean[field]);
    if (error) {
      errors.push({ field, error });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, clean };
  }

  return { valid: true, clean };
}

// ── Rate limiting (client-side, per-UID) ───────────────────────

const rateLimitStore = new Map();

export function checkRateLimit(key, maxAttempts = 5, windowMs = 60_000) {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now - record.start > windowMs) {
    rateLimitStore.set(key, { start: now, count: 1 });
    return true;
  }

  record.count++;
  if (record.count > maxAttempts) {
    return false;
  }

  return true;
}

export function resetRateLimit(key) {
  rateLimitStore.delete(key);
}
