import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import CancellationRequestForm, {
  CancellationOutcome,
} from "./CancellationRequestForm";
import { getCancellationQuote } from "../../services/api";

vi.mock("../../services/api", () => ({
  getCancellationQuote: vi.fn(),
}));

const booking = {
  id: 7,
  referenceNumber: "TC-2026-ABCD",
  customerEmail: "juan@tc.com",
};

const quote = (overrides = {}) => ({
  policyTier: "late",
  passengerFare: 7500,
  airlineCancellationFee: 375,
  agencyFee: 500,
  paymentFee: 100,
  totalFees: 975,
  refundAmount: 6525,
  refundMethod: "original-payment",
  requiresApproval: true,
  message: "Late cancellations are reviewed by our team.",
  expiresAt: "2026-05-01T10:00:00Z",
  ...overrides,
});

describe("CancellationRequestForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the server-computed refund and the fee breakdown", async () => {
    getCancellationQuote.mockResolvedValue(quote());

    render(<CancellationRequestForm booking={booking} onSubmit={vi.fn()} />);

    await waitFor(() => expect(getCancellationQuote).toHaveBeenCalled());
    expect(getCancellationQuote).toHaveBeenCalledWith(7, {
      referenceNumber: "TC-2026-ABCD",
      customerEmail: "juan@tc.com",
    });

    const panel = await screen.findByText("Late cancellation (staff review)");
    expect(panel).toBeTruthy();
    // Shown twice on purpose: the tier badge and the breakdown total.
    expect(screen.getAllByText("₱6,525.00").length).toBe(2);
    expect(screen.getByText("Airline cancellation fee")).toBeTruthy();
    expect(screen.getByText("- ₱375.00")).toBeTruthy();
    expect(screen.getByText(/Your booking is still confirmed while our team reviews/)).toBeTruthy();
  });

  it("never invents a refund when the quote cannot be loaded", async () => {
    getCancellationQuote.mockRejectedValue(new Error("nope"));

    render(<CancellationRequestForm booking={booking} onSubmit={vi.fn()} />);

    expect(await screen.findByText(/Could not load your refund estimate/)).toBeTruthy();
    expect(screen.queryByText("₱6,525.00")).toBeNull();
    expect(screen.queryByText(/Confirm & Refund/)).toBeNull();
  });

  it("offers a retry after a failed quote", async () => {
    getCancellationQuote.mockRejectedValueOnce(new Error("nope"));

    render(<CancellationRequestForm booking={booking} onSubmit={vi.fn()} />);

    fireEvent.click(await screen.findByText("Retry"));

    await waitFor(() => expect(getCancellationQuote).toHaveBeenCalledTimes(2));
  });

  it("submits the chosen reason code", async () => {
    getCancellationQuote.mockResolvedValue(quote({ requiresApproval: false }));
    const onSubmit = vi.fn().mockResolvedValue({ success: true });

    render(<CancellationRequestForm booking={booking} onSubmit={onSubmit} />);

    const select = await screen.findByLabelText("Reason for cancelling");
    fireEvent.change(select, { target: { value: "illness" } });
    fireEvent.click(screen.getByText("Confirm & Refund"));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(7, { reasonCode: "illness", reason: "" })
    );
  });

  it("asks for details when the customer picks other", async () => {
    getCancellationQuote.mockResolvedValue(quote());
    const onSubmit = vi.fn().mockResolvedValue({ success: true });

    render(<CancellationRequestForm booking={booking} onSubmit={onSubmit} />);

    const select = await screen.findByLabelText("Reason for cancelling");
    fireEvent.change(select, { target: { value: "other" } });
    fireEvent.change(screen.getByLabelText("Tell us more"), {
      target: { value: "Flight rescheduled twice" },
    });
    fireEvent.click(screen.getByText("Confirm & Refund"));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(7, {
        reasonCode: "other",
        reason: "Flight rescheduled twice",
      })
    );
  });
});

describe("CancellationOutcome", () => {
  it("tells the customer when staff must still approve", () => {
    render(
      <CancellationOutcome
        outcome={{
          requiresApproval: true,
          message: "Our team will respond within 24 hours.",
          refundAmount: 6525,
          refundReference: "RFND-1",
        }}
      />
    );

    expect(screen.getByText("Cancellation requested")).toBeTruthy();
    expect(screen.getByText("Our team will respond within 24 hours.")).toBeTruthy();
    expect(screen.getByText("₱6,525.00")).toBeTruthy();
  });

  it("confirms a cancellation that was approved immediately", () => {
    render(
      <CancellationOutcome outcome={{ requiresApproval: false, message: "Booking cancelled.", refundAmount: 0 }} />
    );

    expect(screen.getByText("Cancellation confirmed")).toBeTruthy();
  });
});
