import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BookingCheckoutModal from "../../../components/modals/booking/BookingCheckoutModal";

const mocks = vi.hoisted(() => ({
  booking: {
    checkoutModalOpen: true,
    checkoutPackage: {
      name: "Seaside Villa",
      title: "Seaside Villa",
      location: "Bali",
      price: 5000,
      category: "hotel",
      services: {},
    },
    appliedPromo: null,
    closeCheckoutModal: vi.fn(),
    processAndCreateBooking: vi.fn(),
    validatePromoCode: vi.fn(),
    walletBalance: 0,
  },
  auth: {
    user: { name: "Juan Dela Cruz", email: "juan@tc.com", phone: "+63 917 123 4567" },
  },
  currency: {
    displayPrice: (n) => `₱${Number(n || 0).toLocaleString()}`,
  },
  api: {
    sendCustomerInquiry: vi.fn(),
    flightsApi: { list: vi.fn(() => Promise.resolve([])) },
  },
}));

vi.mock("../../../context/BookingContext", () => ({
  useBooking: () => mocks.booking,
}));
vi.mock("../../../context/AuthContext", () => ({
  useAuth: () => mocks.auth,
}));
vi.mock("../../../context/CurrencyContext", () => ({
  useCurrency: () => mocks.currency,
}));
vi.mock("../../../services/api", () => ({
  sendCustomerInquiry: mocks.api.sendCustomerInquiry,
  flightsApi: mocks.api.flightsApi,
}));
vi.mock("../../../components/modals/booking/SeatMapModal", () => {
  const SeatMapModal = () => null;
  return { default: SeatMapModal };
});

const toPaymentStep = async () => {
  fireEvent.click(await screen.findByText("Continue to Passenger Details"));
  fireEvent.click(await screen.findByText("Continue to Payment"));
  return screen.findByPlaceholderText("Promo code? (e.g. SUMMER26, WELCOME50)");
};

beforeEach(() => {
  mocks.booking.validatePromoCode.mockReset();
  mocks.booking.processAndCreateBooking.mockReset();
  mocks.booking.walletBalance = 0;
});

describe("BookingCheckoutModal promo application", () => {
  it("applies a valid code and shows the discounted total on step 1 & 3", async () => {
    mocks.booking.validatePromoCode.mockResolvedValue({
      valid: true,
      code: "SUMMER26",
      description: "25% Summer Discount",
      discountAmount: 1250,
      finalAmount: 3750,
    });

    render(<BookingCheckoutModal />);

    const input = await toPaymentStep();
    fireEvent.change(input, { target: { value: "SUMMER26" } });
    fireEvent.click(screen.getByText("Apply"));

    expect(await screen.findByText(/Promo Applied: 25% Summer Discount/)).toBeInTheDocument();
    expect(screen.getByText("-₱1,250")).toBeInTheDocument();
    expect(screen.getByText("₱3,750")).toBeInTheDocument();
  });

  it("shows the server rejection message and applies no discount", async () => {
    mocks.booking.validatePromoCode.mockResolvedValue({
      valid: false,
      message: "This promo code has expired.",
    });

    render(<BookingCheckoutModal />);

    const input = await toPaymentStep();
    fireEvent.change(input, { target: { value: "STALE" } });
    fireEvent.click(screen.getByText("Apply"));

    expect(await screen.findByText("This promo code has expired.")).toBeInTheDocument();
    expect(screen.queryByText(/Promo Applied/)).not.toBeInTheDocument();
    expect(mocks.booking.validatePromoCode).toHaveBeenCalledWith("STALE", 5000);
  });

  it("carries the applied promo into the booking payload on confirm", async () => {
    mocks.booking.validatePromoCode.mockResolvedValue({
      valid: true,
      code: "WELCOME50",
      description: "₱50 Welcome Discount",
      discountAmount: 50,
      finalAmount: 4950,
    });
    mocks.booking.processAndCreateBooking.mockResolvedValue({ id: 9, name: "Seaside Villa" });

    render(<BookingCheckoutModal />);

    const input = await toPaymentStep();
    fireEvent.change(input, { target: { value: "WELCOME50" } });
    fireEvent.click(screen.getByText("Apply"));
    await screen.findByText(/Promo Applied/);

    fireEvent.click(screen.getByRole("button", { name: /Pay ₱4,950 & Confirm Booking/ }));

    await waitFor(() =>
      expect(mocks.booking.processAndCreateBooking).toHaveBeenCalled()
    );
    const [bookingPayload, paymentPayload] =
      mocks.booking.processAndCreateBooking.mock.calls[0];

    expect(bookingPayload.promoCodeUsed).toBe("WELCOME50");
    expect(bookingPayload.discountAmount).toBe(50);
    expect(bookingPayload.totalAmount).toBe(4950);
    expect(bookingPayload.subtotal).toBe(5000);
    expect(paymentPayload.amount).toBe(4950);

    expect(await screen.findByText("Your Booking is Complete!")).toBeInTheDocument();
  });
});

describe("BookingCheckoutModal customer contact", () => {
  it("blocks advancing to payment when the mobile number is invalid", async () => {
    render(<BookingCheckoutModal />);
    fireEvent.click(await screen.findByText("Continue to Passenger Details"));

    const phoneInput = screen.getByPlaceholderText("9XX-XXX-XXXX");
    fireEvent.change(phoneInput, { target: { value: "+63 123" } });
    fireEvent.click(screen.getByText("Continue to Payment"));

    expect(
      await screen.findByText(/valid mobile number — 10 digits starting with 9/)
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Promo code? (e.g. SUMMER26, WELCOME50)")).not.toBeInTheDocument();
  });

  it("caps the number at 10 digits and strips non-numeric characters", async () => {
    render(<BookingCheckoutModal />);
    fireEvent.click(await screen.findByText("Continue to Passenger Details"));

    const phoneInput = screen.getByPlaceholderText("9XX-XXX-XXXX");
    fireEvent.change(phoneInput, {
      target: { value: "+63917 123-4567 890" },
    });

    expect(phoneInput).toHaveValue("+63 917-123-4567");
  });
});

describe("BookingCheckoutModal card payment", () => {
  const fillCard = async () => {
    fireEvent.click(screen.getByRole("radio", { name: /Credit \/ Debit Card/ }));
    fireEvent.change(screen.getByLabelText("Name on card"), {
      target: { value: "Juan Dela Cruz" },
    });
    fireEvent.change(screen.getByLabelText("Card number"), {
      target: { value: "4242424242424242" },
    });
    fireEvent.change(screen.getByLabelText("Expiry"), { target: { value: "12/28" } });
    fireEvent.change(screen.getByLabelText("CVV"), { target: { value: "123" } });
  };

  it("shows the card form when Credit / Debit Card is selected", async () => {
    render(<BookingCheckoutModal />);
    await toPaymentStep();

    expect(screen.queryByPlaceholderText("4242 4242 4242 4242")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Credit \/ Debit Card/ }));
    expect(screen.getByPlaceholderText("4242 4242 4242 4242")).toBeInTheDocument();
  });

  it("blocks submit until the card details are valid", async () => {
    render(<BookingCheckoutModal />);
    await toPaymentStep();
    fireEvent.click(screen.getByRole("radio", { name: /Credit \/ Debit Card/ }));

    const payButton = screen.getByRole("button", { name: /Pay ₱5,000 & Confirm Booking/ });
    expect(payButton).toBeDisabled();

    await fillCard();
    await waitFor(() => expect(payButton).toBeEnabled());
  });

  it("passes the validated card through to processAndCreateBooking on confirm", async () => {
    mocks.booking.processAndCreateBooking.mockResolvedValue({ id: 9, name: "Seaside Villa" });
    render(<BookingCheckoutModal />);
    await toPaymentStep();

    await fillCard();
    const payButton = screen.getByRole("button", { name: /Pay ₱5,000 & Confirm Booking/ });
    await waitFor(() => expect(payButton).toBeEnabled());
    fireEvent.click(payButton);

    await waitFor(() =>
      expect(mocks.booking.processAndCreateBooking).toHaveBeenCalled()
    );
    const [, , cardArg] = mocks.booking.processAndCreateBooking.mock.calls[0];
    expect(cardArg).toEqual({
      cardNumber: "4242424242424242",
      expiry: "12 / 28",
      cvc: "123",
      holderName: "Juan Dela Cruz",
    });

    expect(await screen.findByText("Your Booking is Complete!")).toBeInTheDocument();
  });
});