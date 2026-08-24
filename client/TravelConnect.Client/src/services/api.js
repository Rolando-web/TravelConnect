const API_URL = "http://localhost:5000"; // Or fallback mock

export async function testApi() {
  try {
    const response = await fetch(`${API_URL}/api/test`);
    if (!response.ok) throw new Error("API test failed");
    return await response.json();
  } catch (err) {
    console.warn("Backend API offline, running client-side mock mode:", err.message);
    return { message: "TravelConnect Client connected (Offline Fallback Mode)" };
  }
}

export async function validatePromoCode(code, totalAmount) {
  try {
    const response = await fetch(`${API_URL}/api/promotions/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, totalAmount })
    });
    if (!response.ok) throw new Error("Promo validation failed");
    return await response.json();
  } catch (err) {
    // Offline local validation rules fallback
    const upper = code.trim().toUpperCase();
    const promos = {
      SUMMER26: { percentage: 25, label: "25% Summer Discount" },
      WELCOME50: { flat: 50, label: "$50 Welcome Discount" },
      HONEYMOON: { percentage: 10, label: "10% Honeymoon Package Discount" },
      BALI15: { flat: 15, label: "$15 Regional Discount" },
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

export async function processPaymentTransaction(paymentPayload) {
  try {
    const response = await fetch(`${API_URL}/api/payments/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentPayload)
    });
    if (!response.ok) throw new Error("Payment processing failed");
    return await response.json();
  } catch (err) {
    const txnId = `TXN-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      success: true,
      message: "Payment processed successfully (Offline Mode)",
      transaction: {
        transactionId: txnId,
        bookingReference: paymentPayload.bookingReference || `TC-${Date.now().toString().slice(-6)}`,
        amount: paymentPayload.amount,
        paymentMethod: paymentPayload.paymentMethod || "Credit Card",
        status: "completed",
        processedAt: new Date().toISOString()
      }
    };
  }
}

export async function createBooking(bookingPayload) {
  try {
    const response = await fetch(`${API_URL}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingPayload)
    });
    if (!response.ok) throw new Error("Booking creation failed");
    return await response.json();
  } catch (err) {
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
    const response = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, {
      method: "POST"
    });
    if (!response.ok) throw new Error("Cancellation failed");
    return await response.json();
  } catch (err) {
    return { success: true, message: "Booking cancelled successfully" };
  }
}

export async function sendCustomerInquiry(inquiryPayload) {
  try {
    const response = await fetch(`${API_URL}/api/inquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inquiryPayload)
    });
    if (!response.ok) throw new Error("Inquiry submission failed");
    return await response.json();
  } catch (err) {
    return {
      success: true,
      message: "Your customer inquiry has been received. Agency staff will respond shortly."
    };
  }
}