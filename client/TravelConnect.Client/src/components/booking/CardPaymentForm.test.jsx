import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CardPaymentForm from "../booking/CardPaymentForm";

const base = { cardNumber: "", expiry: "", cvc: "", holderName: "" };

describe("CardPaymentForm", () => {
  it("detects card network from the bin and shows the brand badge", () => {
    const { rerender } = render(
      <CardPaymentForm value={{ ...base, cardNumber: "4242424242424242" }} onChange={vi.fn()} />
    );
    expect(screen.getByText("Visa")).toBeTruthy();
    rerender(<CardPaymentForm value={{ ...base, cardNumber: "5555555555554444" }} onChange={vi.fn()} />);
    expect(screen.getByText("Mastercard")).toBeTruthy();
    rerender(<CardPaymentForm value={{ ...base, cardNumber: "378282246310005" }} onChange={vi.fn()} />);
    expect(screen.getByText("Amex")).toBeTruthy();
    rerender(<CardPaymentForm value={{ ...base, cardNumber: "3566002020360505" }} onChange={vi.fn()} />);
    expect(screen.getByText("JCB")).toBeTruthy();
  });

  it("grouping number input into 4-digit blocks like a real card", () => {
    render(<CardPaymentForm value={{ ...base, cardNumber: "4242424242424242" }} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Card number")).toHaveValue("4242 4242 4242 4242");
  });

  it("formats expiry as MM / YY while typing", () => {
    const onChange = vi.fn();
    render(<CardPaymentForm value={base} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Expiry"), { target: { value: "12/28" } });
    expect(onChange).toHaveBeenCalledWith("expiry", "12 / 28");
  });

  it("is valid for a complete Visa test card with a future expiry", async () => {
    const onValidation = vi.fn();
    const props = {
      value: {
        cardNumber: "4242424242424242",
        expiry: "12 / 28",
        cvc: "123",
        holderName: "Juan Dela Cruz",
      },
      onChange: vi.fn(),
      onValidation,
    };
    render(<CardPaymentForm {...props} />);
    await waitFor(() => expect(onValidation).toHaveBeenLastCalledWith({ valid: true, brand: "Visa" }));
  });

  it("flags a mistyped card number (invalid Luhn)", async () => {
    const onValidation = vi.fn();
    render(
      <CardPaymentForm
        value={{ ...base, cardNumber: "4242424242424241", expiry: "12 / 28", cvc: "123", holderName: "Juan Dela Cruz" }}
        onChange={vi.fn()}
        onValidation={onValidation}
      />
    );
    await waitFor(() => expect(onValidation).toHaveBeenLastCalledWith({ valid: false, brand: "Visa" }));
  });

  it("allows PayMongo sandbox test cards that skip the Luhn checksum", async () => {
    const onValidation = vi.fn();
    render(
      <CardPaymentForm
        value={{ cardNumber: "4343434343434345", expiry: "12 / 28", cvc: "123", holderName: "Juan Dela Cruz" }}
        onChange={vi.fn()}
        onValidation={onValidation}
      />
    );
    await waitFor(() => expect(onValidation).toHaveBeenLastCalledWith({ valid: true, brand: "Visa" }));
  });

  it("requires a 4-digit CVV for Amex cards and shows the brand badge", () => {
    const onChange = vi.fn();
    const { container } = render(
      <CardPaymentForm value={{ ...base, cardNumber: "378282246310005" }} onChange={onChange} />
    );
    expect(screen.getByText("Amex")).toBeTruthy();
    expect(container.querySelector('input[aria-label="CVV (4 digits)"]')).toBeTruthy();
  });

  it("marks name, expiry and cvc fields invalid until filled correctly", async () => {
    const onValidation = vi.fn();
    render(
      <CardPaymentForm
        value={{ cardNumber: "4242424242424242", expiry: "01 / 22", cvc: "12", holderName: "J" }}
        onChange={vi.fn()}
        onValidation={onValidation}
      />
    );
    await waitFor(() => expect(onValidation).toHaveBeenLastCalledWith({ valid: false, brand: "Visa" }));
  });
});