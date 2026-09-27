import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, act } from "@testing-library/react";
import { BookingProvider, useBooking } from "./BookingContext";

const api = vi.hoisted(() => ({
  bookingsApi: { list: vi.fn() },
  requestBookingCancellation: vi.fn(),
  createBooking: vi.fn(),
  createPayMongoCheckout: vi.fn(),
  getPayMongoCheckoutStatus: vi.fn(),
  finalizePayMongoPayment: vi.fn(),
  createCardIntent: vi.fn(),
  attachCard: vi.fn(),
  getCardIntentStatus: vi.fn(),
  validatePromoCode: vi.fn(),
}));

vi.mock("../services/api", () => api);
vi.mock("./AuthContext", () => ({
  useAuth: () => ({ user: { email: "juan@tc.com" } }),
}));
vi.mock("../services/firebase", () => ({ auth: { currentUser: null } }));

const booking = {
  id: 7,
  referenceNumber: "TC-2026-ABCD",
  customerEmail: "juan@tc.com",
  status: "upcoming",
  paid: true,
  amount: 10000,
};

let ctx;
function Probe() {
  const bookingCtx = useBooking();
  useEffect(() => {
    ctx = bookingCtx;
  }, [bookingCtx]);
  return null;
}

describe("BookingContext cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    api.bookingsApi.list.mockResolvedValue([booking]);
  });

  it("sends the reason and the booking proof, then mirrors the server verdict", async () => {
    api.requestBookingCancellation.mockResolvedValue({
      success: true,
      message: "Cancellation requested for review.",
      bookingStatus: "cancellation-requested",
      cancellationStatus: "PendingReview",
      cancellation: { reference: "CNL-1", policyTier: "late", refundAmount: 6525, requiresApproval: true },
      refund: { reference: "RFND-1", amount: 6525, status: "Pending" },
    });

    render(
      <BookingProvider>
        <Probe />
      </BookingProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    const result = await act(async () =>
      ctx.cancelBookingTransaction(7, { reasonCode: "illness", reason: "" })
    );

    expect(api.requestBookingCancellation).toHaveBeenCalledWith(7, {
      reasonCode: "illness",
      reason: "",
      referenceNumber: "TC-2026-ABCD",
      customerEmail: "juan@tc.com",
    });

    expect(result.message).toBe("Cancellation requested for review.");
    expect(result.requiresApproval).toBe(true);
    expect(result.refundAmount).toBe(6525);
    expect(result.refundReference).toBe("RFND-1");

    const updated = ctx.bookings.find((b) => b.id === 7);
    expect(updated.status).toBe("cancellation-requested");
    expect(updated.cancellationStatus).toBe("PendingReview");
    expect(updated.refundStatus).toBe("Pending");
  });

  it("refuses to fake a refund or wallet credit when the server rejects", async () => {
    api.requestBookingCancellation.mockRejectedValue(new Error("Booking already departed."));

    render(
      <BookingProvider>
        <Probe />
      </BookingProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    let thrown;
    await act(async () => {
      thrown = await ctx
        .cancelBookingTransaction(7, { reasonCode: "other", reason: "x" })
        .catch((err) => err);
    });

    expect(thrown.message).toBe("Booking already departed.");

    const untouched = ctx.bookings.find((b) => b.id === 7);
    expect(untouched.status).toBe("upcoming");
    expect(untouched.paid).toBe(true);
    expect(untouched.refundAmount ?? 0).toBe(0);
    // The wallet is untouched: no money moved.
    expect(ctx.walletBalance).toBe(0);
    expect(localStorage.getItem("travelconnect_wallet:juan@tc.com")).toBeNull();
  });

  it("defaults the reason code so a bare call still sends a valid payload", async () => {
    api.requestBookingCancellation.mockResolvedValue({
      success: true,
      message: "Booking cancelled.",
      bookingStatus: "cancelled",
      cancellation: { policyTier: "grace", refundAmount: 10000, requiresApproval: false },
    });

    render(
      <BookingProvider>
        <Probe />
      </BookingProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => ctx.cancelBookingTransaction(7));

    expect(api.requestBookingCancellation).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ reasonCode: "change-of-plans" })
    );
  });
});
