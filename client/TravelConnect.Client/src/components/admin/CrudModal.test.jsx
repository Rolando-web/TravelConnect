import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CrudModal from "./CrudModal";

vi.mock("../../services/api", () => ({
  uploadImage: vi.fn(),
  assetUrl: (u) => u,
}));

const fields = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", type: "email" },
  { key: "price", label: "Price", type: "number", required: true, min: 0 },
  { key: "rating", label: "Rating", type: "number", min: 0, max: 5 },
];

const renderModal = (onSave = vi.fn(), data = {}, fieldsOverride) =>
  render(
    <CrudModal
      open
      title="Test Entity"
      mode="edit"
      fields={fieldsOverride || fields}
      data={data}
      onSave={onSave}
    />
  );

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

describe("CrudModal input validation", () => {
  it("clearing a required numeric field fires a required error instead of writing 0", () => {
    const onSave = vi.fn();
    renderModal(onSave, { name: "A", email: "a@b.co", price: 100, rating: 3 });

    const price = screen.getByDisplayValue("100");
    fireEvent.change(price, { target: { value: "" } });
    submit();

    expect(screen.getByText("Price is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range rating", () => {
    renderModal(vi.fn(), { name: "A", email: "a@b.co", price: 100, rating: 3 });

    const rating = screen.getByDisplayValue("3");
    fireEvent.change(rating, { target: { value: "6" } });
    submit();

    expect(screen.getByText("Rating must be at most 5")).toBeInTheDocument();
  });

  it("rejects a malformed email", () => {
    renderModal(vi.fn(), { name: "A", email: "a@b.co", price: 100 });

    const email = screen.getByDisplayValue("a@b.co");
    fireEvent.change(email, { target: { value: "not-an-email" } });
    submit();

    expect(screen.getByText("Email must be a valid email address")).toBeInTheDocument();
  });

  it("passes the coerced numeric values to onSave on a valid submit", () => {
    const onSave = vi.fn();
    renderModal(onSave, { name: "A", email: "a@b.co", price: 100, rating: 3 });
    submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ price: 100, rating: 3 })
    );
  });
});

describe("CrudModal password fields", () => {
  const passwordFields = [
    { key: "email", label: "Email", type: "email" },
    {
      key: "password",
      label: "Temporary Password",
      type: "password",
      required: true,
      minLength: 6,
      autoComplete: "new-password",
    },
  ];

  it("renders a masked password input", () => {
    renderModal(vi.fn(), {}, passwordFields);
    const input = screen.getByText("Temporary Password").parentElement.querySelector("input");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("minlength", "6");
    expect(input).toHaveAttribute("autocomplete", "new-password");
  });

  it("rejects a password shorter than the minimum", () => {
    renderModal(vi.fn(), {}, passwordFields);
    fireEvent.change(
      screen.getByText("Temporary Password").parentElement.querySelector("input"),
      { target: { value: "12345" } }
    );
    submit();

    expect(
      screen.getByText("Temporary Password must be at least 6 characters")
    ).toBeInTheDocument();
  });

  it("requires the temporary password", () => {
    const onSave = vi.fn();
    renderModal(onSave, { email: "staff@tc.com" }, passwordFields);
    submit();

    expect(screen.getByText("Temporary Password is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});