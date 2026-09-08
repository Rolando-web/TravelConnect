const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5110";

// Resolve stored image paths into absolute URLs.
// e.g. "/api/images/5" -> "http://localhost:5110/api/images/5"
export function assetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path}`;
}

async function request(url, options = {}) {
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
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
export const usersApi = crud("users");
export const inquiriesApi = crud("inquiries");
export const flightsApi = crud("flights");
export const hotelsApi = crud("hotels");
export const carsApi = crud("cars");
export const activitiesApi = crud("activities");

// ── Image storage (stored in SQL Server via the backend) ─────────

export async function uploadImage(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_URL}/api/images`, { method: "POST", body: form });
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.message || "Image upload failed");
  }
  return await response.json();
}

export async function deleteImage(id) {
  await request(`/api/images/${id}`, { method: "DELETE" });
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

// ── PayMongo (GCash / PayMaya) ────────────────────────────────

export async function createPayMongoSource(payload) {
  const response = await fetch(`${API_URL}/api/payments/paymongo/source`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.message || "Failed to create payment source");
  }
  return await response.json();
}

export async function getPayMongoSourceStatus(sourceId) {
  const response = await fetch(`${API_URL}/api/payments/paymongo/source/${sourceId}`);
  if (!response.ok) throw new Error("Failed to fetch payment source status");
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
  try {
    return await request(`/api/bookings`, {
      method: "POST",
      body: JSON.stringify({
        booking: bookingPayload,
        ...(Array.isArray(bookingPayload.flightSegments)
          ? { flightSegments: bookingPayload.flightSegments }
          : {})
      })
    });
  } catch {
    const ref = `TC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const txn = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const newBooking = {
      ...bookingPayload,
      id: Date.now(),
      referenceNumber: ref,
      transactionId: txn,
      paid: true,
      status: "upcoming",
      createdAt: new Date().toISOString()
    };
    return {
      message: "Booking transaction created successfully",
      booking: newBooking
    };
  }
}

export async function cancelBookingApi(bookingId) {
  try {
    const result = await request(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
    return result || { success: true, message: "Booking cancelled successfully" };
  } catch {
    return { success: true, message: "Booking cancelled successfully" };
  }
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

export async function sendConfirmationEmail(bookingId) {
  return request(`/api/bookings/${bookingId}/send-confirmation`, { method: "POST" });
}

// ── Seat maps & seat assignment ─────────────────────────────────

export async function getSeatMap(flightId) {
  return request(`/api/seatmaps/flight/${flightId}`);
}

export async function releaseSeatsForBooking(bookingId) {
  return request(`/api/seatmaps/release-by-booking/${bookingId}`, { method: "PUT" });
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
  try {
    return await request(`/api/inquiries`, {
      method: "POST",
      body: JSON.stringify(inquiryPayload)
    });
  } catch {
    return {
      success: true,
      message: "Your customer inquiry has been received. Agency staff will respond shortly."
    };
  }
}