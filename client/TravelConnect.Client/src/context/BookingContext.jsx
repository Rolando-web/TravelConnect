import { createContext, useContext, useState, useEffect } from "react";
import { createBooking, cancelBookingApi, createPayMongoSource, getPayMongoSourceStatus, finalizePayMongoPayment, validatePromoCode } from "../services/api";

const BookingContext = createContext();

const INITIAL_MOCK_BOOKINGS = [
  {
    id: "TC-2026-0814",
    name: "Bali Serenity Escape",
    location: "Bali, Indonesia",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    startDate: "2026-09-15",
    endDate: "2026-09-22",
    travellers: 2,
    amount: 2598,
    subtotal: 2598,
    discountAmount: 0,
    status: "upcoming",
    paid: true,
    paymentMethod: "Credit Card",
    transactionId: "TXN-BALI-98421",
    services: {
      flight: "Garuda Indonesia GA-882 (Roundtrip)",
      hotel: "Alila Villas Uluwatu (Ocean View Suite, 7 Nights)",
      car: "SUV Rental with Private Driver",
      activities: "Ubud Monkey Forest, Sunset Catamaran Cruise, Tanah Lot Temple Tour"
    }
  },
  {
    id: "TC-2026-0601",
    name: "Tokyo Neon & Culture",
    location: "Tokyo, Japan",
    img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
    startDate: "2026-06-10",
    endDate: "2026-06-15",
    travellers: 2,
    amount: 3740,
    subtotal: 3740,
    discountAmount: 0,
    status: "completed",
    paid: true,
    paymentMethod: "PayPal",
    transactionId: "TXN-TOKYO-44120",
    services: {
      flight: "Japan Airlines JL-005 (Non-stop Express)",
      hotel: "Keio Plaza Hotel Tokyo (5 Nights)",
      car: "Suica Unlimited Rail Pass + Metro Pass",
      activities: "Shibuya Food Crawl, Mount Fuji Day Trip, Senso-ji Temple Pass"
    }
  },
  {
    id: "TC-2026-0310",
    name: "Santorini Sunset Retreat",
    location: "Santorini, Greece",
    img: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&q=80",
    startDate: "2026-03-20",
    endDate: "2026-03-26",
    travellers: 2,
    amount: 3196,
    subtotal: 3196,
    discountAmount: 0,
    status: "completed",
    paid: true,
    paymentMethod: "Credit Card",
    transactionId: "TXN-GREECE-11204",
    services: {
      flight: "Aegean Airlines A3-610",
      hotel: "Canaves Oia Luxury Suites (6 Nights)",
      car: "Convertible Mini Cooper Rental",
      activities: "Caldera Wine Tasting Cruise, Oia Sunset Dinner"
    }
  },
  {
    id: "TC-2026-0202",
    name: "Swiss Alps Winter Escape",
    location: "Switzerland",
    img: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&q=80",
    startDate: "2026-02-14",
    endDate: "2026-02-24",
    travellers: 1,
    amount: 3075,
    subtotal: 3075,
    discountAmount: 0,
    status: "cancelled",
    paid: false,
    paymentMethod: "Credit Card",
    transactionId: "TXN-SWISS-00129",
    services: {
      flight: "Swiss International LX-019",
      hotel: "Zermatt Alpine Resort (10 Nights)",
      car: "Swiss Travel Pass Unlimited Rail",
      activities: "Matterhorn Glacier Cable Car, Ski Equipment Rental"
    }
  }
];

export function BookingProvider({ children }) {
  const [bookings, setBookings] = useState(() => {
    try {
      const saved = localStorage.getItem("travelconnect_user_bookings");
      return saved ? JSON.parse(saved) : INITIAL_MOCK_BOOKINGS;
    } catch {
      return INITIAL_MOCK_BOOKINGS;
    }
  });

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutPackage, setCheckoutPackage] = useState(null);
  const [appliedPromo, setAppliedPromo] = useState(null);
  
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem("travelconnect_user_bookings", JSON.stringify(bookings));
    } catch (e) {
      console.error("Failed to save bookings to localStorage", e);
    }
  }, [bookings]);

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
    const methodKey = ["gcash", "paymaya"].includes(paymentData.paymentMethod)
      ? paymentData.paymentMethod
      : "gcash";

    let transactionId;

    // 1. Attempt real PayMongo transaction (GCash / PayMaya)
    try {
      const source = await createPayMongoSource({
        method: methodKey,
        amount: bookingData.totalAmount,
        customerName: bookingData.customerName,
        customerEmail: bookingData.customerEmail,
        bookingReference: bookingData.promoCodeUsed || bookingData.customerName
      });

      if (source.checkoutUrl) {
        const popup = window.open(source.checkoutUrl, "_blank", "noopener,noreferrer,width=520,height=640");
        const hasPopup = !!popup;

        // Poll the source until it becomes payable/chargeable.
        const deadline = Date.now() + Number(import.meta.env.VITE_PAYMONGO_POLL_TIMEOUT_MS || 120000);
        let status = source.status ?? "pending";
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 2500));
          const check = await getPayMongoSourceStatus(source.sourceId);
          status = check.status ?? status;
          if (["chargeable", "paid", "charged", "cancelled", "failed", "expired"].includes(status)) break;
        }

        if (!["charged", "paid", "chargeable"].includes(status)) {
          const msg = status === "cancelled"
            ? "Payment was cancelled."
            : status === "failed" || status === "expired"
              ? "Payment failed or expired. Please try again."
              : hasPopup
                ? "Payment approval timed out. Please retry the transaction."
                : "Your browser blocked the payment window. Please allow pop-ups and try again.";
          throw new Error(msg);
        }

        const payment = await finalizePayMongoPayment({
          sourceId: source.sourceId,
          method: methodKey,
          amount: bookingData.totalAmount,
          customerName: bookingData.customerName,
          customerEmail: bookingData.customerEmail,
          bookingReference: bookingData.promoCodeUsed || bookingData.customerName,
          packageName: bookingData.name
        });
        transactionId = payment.transactionId || payment.paymentId;
      } else {
        throw new Error("No checkout URL was returned. Please try again.");
      }
    } catch (err) {
      // Backend offline (or PayMongo failure) — fall back to a local mock payment.
      console.warn("PayMongo unavailable, using offline mock mode:", err.message);
      transactionId = `TXN-OFFLINE-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    // 2. Submit booking to backend/store
    const payload = {
      ...bookingData,
      transactionId: transactionId || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      paymentMethod: methodKey,
      paid: true,
      status: "upcoming"
    };

    const createdResult = await createBooking(payload);
    const finalBooking = createdResult.booking || payload;

    setBookings((prev) => [finalBooking, ...prev]);
    return finalBooking;
  };

  const cancelBookingTransaction = async (bookingId) => {
    await cancelBookingApi(bookingId);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: "cancelled", paid: false } : b
      )
    );
    if (selectedBookingDetails && selectedBookingDetails.id === bookingId) {
      setSelectedBookingDetails((prev) => ({ ...prev, status: "cancelled", paid: false }));
    }
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
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
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
