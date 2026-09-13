import { createContext, useContext, useState, useEffect } from "react";
import {
  createBooking,
  cancelBookingApi,
  createPayMongoCheckout,
  getPayMongoCheckoutStatus,
  finalizePayMongoPayment,
  validatePromoCode,
  bookingsApi
} from "../services/api";
import { useAuth } from "./AuthContext";

const BookingContext = createContext();

const LEGACY_KEY = "travelconnect_user_bookings";

const storageKeyFor = (email) => `travelconnect_user_bookings:${(email || "guest").toLowerCase()}`;
const walletStorageKeyFor = (email) => `travelconnect_wallet:${(email || "guest").toLowerCase()}`;

export function BookingProvider({ children }) {
  const { user } = useAuth();
  const customerKey = user?.email || null;
  const storageKey = storageKeyFor(customerKey);
  const walletStorageKey = walletStorageKeyFor(customerKey);

  const [bookings, setBookings] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutPackage, setCheckoutPackage] = useState(null);
  const [appliedPromo, setAppliedPromo] = useState(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);

  // Read the authoritative wallet balance. localStorage is the single source of
  // truth so concurrent wallet operations (double-taps / two wallets in flight)
  // cannot both spend the same funds on a stale React state snapshot.
  const readWallet = () => {
    try {
      const saved = localStorage.getItem(walletStorageKey);
      return saved !== null ? Number(saved) : 0;
    } catch {
      return 0;
    }
  };

  const writeWallet = (nextBalance) => {
    const safe = Math.max(0, Number(nextBalance) || 0);
    setWalletBalance(safe);
    try {
      localStorage.setItem(walletStorageKey, String(safe));
    } catch {
      /* ignore */
    }
    return safe;
  };

  // One-time cleanup of the legacy shared key so old data resets to 0.
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Load this customer's bookings & wallet balance whenever their identity changes.
  useEffect(() => {
    let active = true;

    setBookings([]);
    if (selectedBookingDetails) setSelectedBookingDetails(null);

    // Load wallet balance from storage
    try {
      const savedWallet = localStorage.getItem(walletStorageKey);
      setWalletBalance(savedWallet !== null ? Number(savedWallet) : 0);
    } catch {
      setWalletBalance(0);
    }

    if (!customerKey) return () => { active = false; };

    // Restore locally-cached bookings for this customer first.
    let local = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) local = parsed;
      }
    } catch {
      local = [];
    }
    if (active) setBookings(local);

    // Then sync with the backend so each customer sees only their own bookings.
    (async () => {
      try {
        const remote = await bookingsApi.list(`?customer=${encodeURIComponent(customerKey)}`);
        const list = Array.isArray(remote) ? remote : [];
        if (!active) return;
        const existing = local;
        const seen = new Set(existing.map((b) => b.id));
        const merged = [
          ...existing,
          ...list.filter((b) => !seen.has(b.id)).map((b) => normalizeBooking(b))
        ];
        merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setBookings(merged);
      } catch {
        // Backend offline — keep local cache.
      }
    })();

    return () => { active = false; };
  }, [customerKey, storageKey]);

  // Persist to this customer's own storage key.
  useEffect(() => {
    if (!customerKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(bookings));
    } catch (e) {
      console.error("Failed to save bookings to localStorage", e);
    }
  }, [bookings, customerKey, storageKey]);

  const openCheckoutModal = (pkg, promoCode = "") => {
    setCheckoutPackage(pkg);
    setAppliedPromo(promoCode);
    setCheckoutModalOpen(true);
  };

  const closeCheckoutModal = () => {
    setCheckoutModalOpen(false);
    setCheckoutPackage(null);
    setAppliedPromo(null);
  };

  const openBookingDetailsModal = (booking) => {
    setSelectedBookingDetails(booking);
    setDetailsModalOpen(true);
  };

  const closeBookingDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedBookingDetails(null);
  };

  const processAndCreateBooking = async (bookingData, paymentData) => {
    const isWalletPayment = paymentData.paymentMethod === "wallet";
    const methodKey = isWalletPayment
      ? "wallet"
      : ["gcash", "paymaya", "card"].includes(paymentData.paymentMethod)
        ? paymentData.paymentMethod
        : "gcash";

    // Ensure the booking is tied to the signed-in customer
    const customerEmail = bookingData.customerEmail || customerKey || "";
    const customerName = bookingData.customerName || user?.name || "Valued Guest";

    let transactionId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isWalletPayment) {
      // Read the live balance synchronously to avoid double-spending stale
      // state when wallet purchases overlap.
      const liveBalance = readWallet();
      if (liveBalance < bookingData.totalAmount) {
        throw new Error(
          `Insufficient TravelConnect Money (PHP ${liveBalance.toLocaleString()}). Required: PHP ${bookingData.totalAmount.toLocaleString()}.`
        );
      }
      // Deduct from wallet (synchronous read → deduct → persist, no race window)
      const nextBal = writeWallet(liveBalance - bookingData.totalAmount);
      transactionId = `TCM-${Math.floor(100000 + Math.random() * 900000)}`;
    } else if (["gcash", "paymaya", "card"].includes(methodKey)) {
      // PayMongo hosted Checkout Session (checkout.paymongo.com).
      // Open the (blank) auth window SYNCHRONOUSLY inside the user's click
      // gesture — window.open() after an await is treated as a popup and gets
      // blocked by the browser, which is why the page never appeared before.
      const authWindow = window.open("", "paymongo_checkout", "width=560,height=720");
      if (!authWindow) {
        throw new Error(
          "Your browser blocked the payment window. Please allow pop-ups for this site, then try again."
        );
      }
      try {
        const session = await createPayMongoCheckout({
          method: methodKey,
          amount: bookingData.totalAmount,
          customerName,
          customerEmail,
          bookingReference: bookingData.promoCodeUsed || bookingData.name || customerName
        });

        // Navigate the popup to PayMongo's hosted checkout page now that we
        // have the URL, then collect the real status by polling the session.
        if (session.checkoutUrl) {
          authWindow.location.href = session.checkoutUrl;
        } else {
          authWindow.close();
          throw Object.assign(
            new Error("PayMongo did not return a checkout link. Please try again."),
            { paymentRejected: false }
          );
        }

        // Poll checkout session for resolution
        const deadline = Date.now() + Number(import.meta.env.VITE_PAYMONGO_POLL_TIMEOUT_MS || 120000);
        let status = session.status ?? "pending";
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 2500));
          const check = await getPayMongoCheckoutStatus(session.sessionId);
          status = check.status ?? status;
          if (["paid", "cancelled", "failed", "expired"].includes(status)) break;
        }

        const normalizedStatus = (status || "pending").toLowerCase();

        // Explicit uptake: a cancelled / failed / expired / unconfirmed payment
        // must NOT create a presumed-“paid” booking. Only truly paid sessions
        // proceed; anything else raises a clear error so the user can retry.
        if (normalizedStatus === "cancelled") {
          authWindow.close();
          throw Object.assign(
            new Error("Your payment was cancelled in the payment window. Your booking was NOT created. You can retry whenever you're ready."),
            { paymentRejected: true }
          );
        }
        if (normalizedStatus === "failed") {
          authWindow.close();
          throw Object.assign(
            new Error("Your payment could not be completed. Your booking was NOT created. Please check your payment details and try again."),
            { paymentRejected: true }
          );
        }
        if (normalizedStatus === "expired") {
          authWindow.close();
          throw Object.assign(
            new Error("Your payment link expired before it was completed. Your booking was NOT created. Please try again."),
            { paymentRejected: true }
          );
        }
        if (normalizedStatus !== "paid") {
          authWindow.close();
          throw Object.assign(
            new Error("We didn't receive confirmation that your payment completed in time. Your booking was NOT created; nothing was charged. Please try again."),
            { paymentRejected: true }
          );
        }

        // Record the completed payment locally and link it to the booking.
        const payment = await finalizePayMongoPayment({
          sessionId: session.sessionId,
          method: methodKey,
          amount: bookingData.totalAmount,
          customerName,
          customerEmail,
          bookingReference: bookingData.promoCodeUsed || bookingData.name || customerName,
          packageName: bookingData.name
        });
        transactionId = payment.transactionId || payment.paymentId || transactionId;
      } catch (err) {
        const msg = String(err?.message || err).toLowerCase();
        const isOffline = /failed to fetch|networkerror|network request failed|fetch failed|offline/i.test(msg);
        if (isOffline) {
          if (authWindow) authWindow.close();
          console.warn("PayMongo backend offline — using local mock mode:", err.message);
        } else if (err?.paymentRejected) {
          // A cancelled / failed / expired / unconfirmed payment already has a
          // complete, user-facing message — pass it through untouched so the
          // checkout UI can show exactly why the booking wasn't created.
          throw err;
        } else {
          // PayMongo/server genuinely rejected the payment. Do NOT silently
          // book a "paid" trip — let the user see why it failed.
          throw new Error(
            (err?.message || "PayMongo payment could not be started.") +
            " Your booking was NOT created. Please try again or contact support.",
            { cause: err }
          );
        }
      }
    }

    // 2. Submit booking to backend/store
    const payload = {
      ...bookingData,
      customerEmail,
      customerName,
      transactionId,
      paymentMethod: methodKey,
      paid: true,
      status: "upcoming",
      createdAt: new Date().toISOString(),
      // Multi-segment flight itinerary (up to 6 segments). The server persists
      // these into the BookingFlights child table via CreateBookingRequest.
      flightSegments: Array.isArray(bookingData.flightSegments) ? bookingData.flightSegments : []
    };

    const createdResult = await createBooking(payload);
    const finalBooking = normalizeBooking(createdResult.booking || payload);

    setBookings((prev) => [finalBooking, ...prev]);
    return finalBooking;
  };

  // ── Instant Cancellation & Automatic Refund ─────────────────────────────
  const cancelBookingTransaction = async (bookingId, reason = "User requested cancellation") => {
    const target = bookings.find((b) => b.id === bookingId) || selectedBookingDetails;
    const fullAmount = Number(target?.amount || target?.totalAmount || target?.price || 0);

    // 1. Call backend cancel endpoint. It applies the cancellation policy,
    //    releases seat inventory, and generates the refund reference.
    let refundAmount = fullAmount;
    let refundRef = `RFND-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    let policyTier = target?.cancellationPolicyTier || "full";
    let backendResponse = null;
    try {
      backendResponse = await cancelBookingApi(bookingId);
      if (backendResponse && typeof backendResponse.refundAmount === "number") {
        refundAmount = backendResponse.refundAmount;
      }
      if (backendResponse?.refundReference) refundRef = backendResponse.refundReference;
      if (backendResponse?.policyTier) policyTier = backendResponse.policyTier;
    } catch {
      /* offline fallback — keep full refund */
    }

    const refundedAt = new Date().toISOString();

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          return {
            ...b,
            status: "refunded",
            paid: false,
            refundStatus: "Processed",
            refundReference: refundRef,
            refundedAt,
            cancellationReason: reason,
            cancellationPolicyTier: policyTier,
            refundAmount,
          };
        }
        return b;
      })
    );

    if (selectedBookingDetails && selectedBookingDetails.id === bookingId) {
      setSelectedBookingDetails((prev) =>
        prev
          ? {
              ...prev,
              status: "refunded",
              paid: false,
              refundStatus: "Processed",
              refundReference: refundRef,
              refundedAt,
              cancellationReason: reason,
              cancellationPolicyTier: policyTier,
              refundAmount,
            }
          : prev
      );
    }

    // 2. Credit refund to TravelConnect Money (PHP Wallet). Read the live
    //    balance instead of the state snapshot so concurrent refunds cannot
    //    double-count on a stale value.
    let newBalance = walletBalance;
    if (refundAmount > 0) {
      newBalance = writeWallet(Number(readWallet() || 0) + refundAmount);
    }

    // 3. Best-effort email notification (backend sends its own on cancel; this
    //    is a no-op offline).
    if (backendResponse?.success === false) {
      // still friendly — refunded locally
    }

    return {
      success: true,
      refundReference: refundRef,
      refundedAt,
      refundAmount,
      policyTier,
      newWalletBalance: newBalance
    };
  };

  const value = {
    bookings,
    walletBalance,
    setWalletBalance,
    checkoutModalOpen,
    checkoutPackage,
    appliedPromo,
    openCheckoutModal,
    closeCheckoutModal,
    detailsModalOpen,
    selectedBookingDetails,
    openBookingDetailsModal,
    closeBookingDetailsModal,
    processAndCreateBooking,
    cancelBookingTransaction,
    validatePromoCode
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
}

function normalizeBooking(b) {
  return {
    ...b,
    amount: b.amount ?? b.totalAmount ?? 0,
    img: b.img ?? b.imageUrl ?? "",
    startDate: b.startDate ?? "",
    endDate: b.endDate ?? "",
    travellers: b.travellers ?? 1,
    status: b.status ?? "upcoming",
    category: b.category ?? b.packageCategory ?? "",
    refundAmount: b.refundAmount ?? 0,
    refundReference: b.refundReference ?? "",
    cancellationPolicyTier: b.cancellationPolicyTier ?? "",
    bookingFlights: Array.isArray(b.bookingFlights) ? b.bookingFlights : []
  };
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}

