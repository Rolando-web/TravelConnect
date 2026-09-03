import { createContext, useContext, useState, useEffect } from "react";
import {
  createBooking,
  cancelBookingApi,
  createPayMongoSource,
  getPayMongoSourceStatus,
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
      : ["gcash", "paymaya"].includes(paymentData.paymentMethod)
        ? paymentData.paymentMethod
        : "gcash";

    // Ensure the booking is tied to the signed-in customer
    const customerEmail = bookingData.customerEmail || customerKey || "";
    const customerName = bookingData.customerName || user?.name || "Valued Guest";

    let transactionId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isWalletPayment) {
      if (walletBalance < bookingData.totalAmount) {
        throw new Error(
          `Insufficient TravelConnect Money (PHP ${walletBalance.toLocaleString()}). Required: PHP ${bookingData.totalAmount.toLocaleString()}.`
        );
      }
      // Deduct from wallet
      const nextBal = Math.max(0, walletBalance - bookingData.totalAmount);
      setWalletBalance(nextBal);
      try {
        localStorage.setItem(walletStorageKey, String(nextBal));
      } catch {}
      transactionId = `TCM-${Math.floor(100000 + Math.random() * 900000)}`;
    } else if (["gcash", "paymaya"].includes(methodKey)) {
      // 1. Attempt real PayMongo transaction (GCash / PayMaya)
      try {
        const source = await createPayMongoSource({
          method: methodKey,
          amount: bookingData.totalAmount,
          customerName,
          customerEmail,
          bookingReference: bookingData.promoCodeUsed || customerName
        });

        // Collect the real status so we know whether payment truly completed.
        if (source.checkoutUrl) {
          const popup = window.open(source.checkoutUrl, "_blank", "noopener,noreferrer,width=520,height=640");

          // Poll source for resolution
          const deadline = Date.now() + Number(import.meta.env.VITE_PAYMONGO_POLL_TIMEOUT_MS || 90000);
          let status = source.status ?? "pending";
          while (Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, 2500));
            const check = await getPayMongoSourceStatus(source.sourceId);
            status = check.status ?? status;
            if (["chargeable", "paid", "charged", "cancelled", "failed", "expired"].includes(status)) break;
          }

          if (["charged", "paid", "chargeable"].includes(status)) {
            const payment = await finalizePayMongoPayment({
              sourceId: source.sourceId,
              method: methodKey,
              amount: bookingData.totalAmount,
              customerName,
              customerEmail,
              bookingReference: bookingData.promoCodeUsed || customerName,
              packageName: bookingData.name
            });
            transactionId = payment.transactionId || payment.paymentId || transactionId;
          }
        }
      } catch (err) {
        const msg = String(err?.message || err).toLowerCase();
        const isOffline = /failed to fetch|networkerror|network request failed|fetch failed|offline/i.test(msg);
        if (isOffline) {
          console.warn("PayMongo backend offline — using local mock mode:", err.message);
        } else {
          // PayMongo/server genuinely rejected the payment. Do NOT silently
          // book a "paid" trip — let the user see why it failed.
          throw new Error(
            (err?.message || "PayMongo payment could not be started.") +
            " Your booking was NOT created. Please try again or contact support."
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
      createdAt: new Date().toISOString()
    };

    const createdResult = await createBooking(payload);
    const finalBooking = normalizeBooking(createdResult.booking || payload);

    setBookings((prev) => [finalBooking, ...prev]);
    return finalBooking;
  };

  // ── Instant Cancellation & Automatic Refund ─────────────────────────────
  const cancelBookingTransaction = async (bookingId, reason = "User requested cancellation") => {
    const refundRef = `RFND-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const refundedAt = new Date().toISOString();

    const target = bookings.find((b) => b.id === bookingId) || selectedBookingDetails;
    const refundAmount = Number(target?.amount || target?.totalAmount || target?.price || 0);

    try {
      await cancelBookingApi(bookingId);
    } catch {
      /* offline fallback */
    }

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
            refundAmount: b.amount || b.totalAmount || refundAmount,
          };
        }
        return b;
      })
    );

    if (selectedBookingDetails && selectedBookingDetails.id === bookingId) {
      setSelectedBookingDetails((prev) => ({
        ...prev,
        status: "refunded",
        paid: false,
        refundStatus: "Processed",
        refundReference: refundRef,
        refundedAt,
        cancellationReason: reason,
        refundAmount: prev.amount || prev.totalAmount || refundAmount,
      }));
    }

    // Credit refund to TravelConnect Money (PHP Wallet)
    let newBalance = walletBalance;
    if (refundAmount > 0) {
      newBalance = Number(walletBalance || 0) + refundAmount;
      setWalletBalance(newBalance);
      try {
        localStorage.setItem(walletStorageKey, String(newBalance));
      } catch {}
    }

    return {
      success: true,
      refundReference: refundRef,
      refundedAt,
      refundAmount,
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
    status: b.status ?? "upcoming"
  };
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}

