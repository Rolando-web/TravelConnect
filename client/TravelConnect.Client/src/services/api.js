import { auth } from "./firebase";

// Guard: Vercel baked "https://travelconnect.runasp.net " (one invisible space)
// into a production bundle and every GCash checkout died with "Failed to fetch".
// Always trim at runtime so a stray space can never corrupt the API base again.
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5110").trim();

// Resolve stored image paths into absolute URLs.
// e.g. "/api/images/5" -> "http://localhost:5110/api/images/5"
export function assetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path}`;
}

async function authHeaders() {
  // Attach the Firebase ID token so [Authorize] endpoints accept the request.
  // Endpoints without [Authorize] (guest checkout, catalog, PayMongo) ignore it.
  const token = await auth.currentUser?.getIdToken(true).catch(() => null);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeaders()),
    ...(options.headers || {})
  };
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    const message = errBody?.message || errBody?.detail || `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

// ── Generic entity CRUD helpers (admin) ─────────────────────────

function crud(resource) {
  return {
    list: (query = "") => request(`/api/${resource}${query}`),
    get: (id) => request(`/api/${resource}/${id}`),
    create: (body) => request(`/api/${resource}`, { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/${resource}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id) => request(`/api/${resource}/${id}`, { method: "DELETE" })
  };
}

export const bookingsApi = crud("bookings");
export const paymentsApi = crud("payments");
export const customersApi = crud("customers");
export const packagesApi = crud("packages");
export const destinationsApi = crud("destinations");
export const promotionsApi = crud("promotions");
export const suppliersApi = crud("suppliers");
export const leadsApi = crud("leads");
export const convertLeadToCustomer = (id) => request(`/api/leads/${id}/convert`, { method: "POST" });
export const setLeadStage = (id, stage) =>
  request(`/api/leads/${id}/stage`, { method: "POST", body: JSON.stringify({ stage }) });
export const usersApi = crud("users");
export const inquiriesApi = crud("inquiries");

// ── Customer Support Chat ─────────────────────────────────────

// Customer-side: open conversations, read a thread, send a message.
export const supportApi = {
  list: () => request("/api/support/conversations"),
  create: (body) => request("/api/support/conversations", { method: "POST", body: JSON.stringify(body) }),
  thread: (id) => request(`/api/support/conversations/${id}`),
  send: (id, body) => request(`/api/support/conversations/${id}/messages`, { method: "POST", body: JSON.stringify(body) }),
  markRead: (id) => request(`/api/support/conversations/${id}/read`, { method: "PUT" }),
};

// Agent/Admin helpdesk: inbox, thread, reply, assign, status.
export const supportAdminApi = {
  inbox: (query = "") => request(`/api/support/inbox${query}`),
  thread: (id) => request(`/api/support/inbox/${id}`),
  reply: (id, body) => request(`/api/support/inbox/${id}/reply`, { method: "POST", body: JSON.stringify(body) }),
  replyEmail: (id, body) => request(`/api/support/inbox/${id}/reply-email`, { method: "POST", body: JSON.stringify(body) }),
  read: (id) => request(`/api/support/inbox/${id}/read`, { method: "PUT" }),
  emails: () => request("/api/support/emails"),
  assign: (id, body) => request(`/api/support/inbox/${id}/assign`, { method: "PUT", body: JSON.stringify(body) }),
  status: (id, body) => request(`/api/support/inbox/${id}/status`, { method: "PUT", body: JSON.stringify(body) }),
  agents: () => request("/api/support/agents"),
};
export const flightsApi = crud("flights");
export const hotelsApi = crud("hotels");
export const carsApi = crud("cars");
export const activitiesApi = crud("activities");

// ── Subscriptions (Super Admin) ─────────────────────────────────

export const subscriptionsApi = {
  list: () => request("/api/subscriptions"),
  get: (id) => request(`/api/subscriptions/${id}`),
  create: (body) => request("/api/subscriptions", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => request(`/api/subscriptions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id) => request(`/api/subscriptions/${id}`, { method: "DELETE" }),
  getPlans: () => request("/api/subscriptions/plans"),
  getPlan: (id) => request(`/api/subscriptions/plans/${id}`),
  getStats: () => request("/api/subscriptions/stats"),
};

// ── Image storage (stored in SQL Server via the backend) ─────────

export async function uploadImage(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_URL}/api/images`, {
    method: "POST",
    body: form,
    headers: await authHeaders()
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.message || "Image upload failed");
  }
  return await response.json();
}

export async function getDashboardSummary() {
  return request("/api/dashboard");
}

export async function getPublicStats() {
  return request("/api/dashboard/public");
}

export async function testApi() {
  try {
    const response = await fetch(`${API_URL}/api/test`);
    if (!response.ok) throw new Error("API test failed");
    return await response.json();
  } catch (_err) {
    console.warn("Backend API offline, running client-side mock mode:", _err.message);
    return { message: "TravelConnect Client connected (Offline Fallback Mode)" };
  }
}

export async function validatePromoCode(code, totalAmount) {
  try {
    const promo = await request(`/api/promotions/code/${encodeURIComponent(code.trim())}`);
    const isPercent = (promo.discountType || "").toLowerCase() === "percent";
    const discountAmount = isPercent
      ? Math.round(totalAmount * (Number(promo.discount) / 100))
      : Math.min(totalAmount, Number(promo.discount));
    return {
      valid: true,
      code: promo.code?.toUpperCase(),
      description: promo.campaignName,
      discountAmount,
      finalAmount: Math.max(0, totalAmount - discountAmount)
    };
  } catch {
    // Offline local validation rules fallback
    const upper = code.trim().toUpperCase();
    const promos = {
      SUMMER26: { percentage: 25, label: "25% Summer Discount" },
      WELCOME50: { flat: 50, label: "₱50 Welcome Discount" },
      HONEYMOON: { percentage: 10, label: "10% Honeymoon Package Discount" },
      BALI15: { flat: 15, label: "₱15 Regional Discount" },
      EARLY2027: { percentage: 25, label: "25% Early Bird Discount" }
    };
    if (promos[upper]) {
      const p = promos[upper];
      const discountAmount = p.percentage
        ? Math.round(totalAmount * (p.percentage / 100))
        : Math.min(totalAmount, p.flat);
      return {
        valid: true,
        code: upper,
        description: p.label,
        discountAmount,
        finalAmount: totalAmount - discountAmount
      };
    }
    return { valid: false, message: "Invalid promo code" };
  }
}

// ── PayMongo (GCash / PayMaya hosted checkout) ──────────────────

// Opens a PayMongo-hosted payment page (checkout.paymongo.com) where the
// customer picks their e-wallet and completes the payment.
export async function createPayMongoCheckout(payload) {
  const response = await fetch(`${API_URL}/api/payments/paymongo/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.message || "Failed to create payment link");
  }
  return await response.json();
}

// Polls a checkout session for its payment status (paid / cancelled / failed / pending).
export async function getPayMongoCheckoutStatus(sessionId) {
  const response = await fetch(`${API_URL}/api/payments/paymongo/checkout/${sessionId}`);
  if (!response.ok) throw new Error("Failed to fetch payment status");
  return await response.json();
}

export async function finalizePayMongoPayment(payload) {
  const response = await fetch(`${API_URL}/api/payments/paymongo/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.message || "Payment finalization failed");
  }
  return await response.json();
}

export async function createBooking(bookingPayload) {
  return request(`/api/bookings`, {
    method: "POST",
    body: JSON.stringify({
      booking: bookingPayload,
      ...(Array.isArray(bookingPayload.flightSegments)
        ? { flightSegments: bookingPayload.flightSegments }
        : {})
    })
  });
}

export async function cancelBookingApi(bookingId) {
  const result = await request(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
  return result || { success: true, message: "Booking cancelled successfully" };
}

// ── Refund preview (tiered cancellation policy) ─────────────────

export async function getRefundPreview(bookingId) {
  try {
    return await request(`/api/bookings/${bookingId}/refund-preview`);
  } catch {
    return null;
  }
}

// ── PDF itinerary & confirmation email ──────────────────────────

export async function generateItineraryPdf(bookingId) {
  const response = await fetch(`${API_URL}/api/bookings/${bookingId}/itinerary-pdf`, {
    method: "POST"
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.message || "PDF generation failed");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match ? match[1] : `TravelConnect-${bookingId}.pdf`;
  return { blob, filename };
}

// ── Seat maps & seat assignment ─────────────────────────────────

export async function getSeatMap(flightId) {
  return request(`/api/seatmaps/flight/${flightId}`);
}

export async function adminOverrideSeat(payload) {
  return request(`/api/seatmaps/admin-override`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

// ── Payment reconciliation & admin refunds ──────────────────────

export async function getPaymentReconciliation(query = "") {
  return request(`/api/payments/reconciliation${query}`);
}

export async function refundPaymentToWallet(paymentId) {
  return request(`/api/payments/${paymentId}/refund-to-wallet`, { method: "POST" });
}

export async function sendCustomerInquiry(inquiryPayload) {
  return request(`/api/inquiries`, {
    method: "POST",
    body: JSON.stringify(inquiryPayload)
  });
}

// Admin notification email for tier inquiries — goes through the backend so
// it is rate-limited (10/min/IP) instead of firing EmailJS straight from the
// browser where spammers could hammer the address.
export async function sendInquiryNotification(payload) {
  return request(`/api/inquiries/notify`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}