import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SupportPage from "./SupportPage";

const mocks = vi.hoisted(() => ({
  inquiriesApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("../../services/api", () => ({
  inquiriesApi: mocks.inquiriesApi,
}));

vi.mock("react-router-dom", () => ({
  useOutletContext: () => ({ role: "Agency Staff" }),
}));

beforeEach(() => {
  mocks.inquiriesApi.list.mockReset();
  mocks.inquiriesApi.create.mockReset();
});

describe("admin SupportPage", () => {
  it("renders header and empty state when no inquiries", async () => {
    mocks.inquiriesApi.list.mockResolvedValue([]);

    render(<SupportPage />);

    expect(screen.getByText("Support & Inquiries")).toBeInTheDocument();
    expect(await screen.findByText("No inquiries yet")).toBeInTheDocument();
  });

  it("renders tickets with subject, category and status", async () => {
    mocks.inquiriesApi.list.mockResolvedValue([
      {
        id: 1,
        subject: "Baggage delay",
        category: "Flight",
        status: "Pending",
        createdAt: "2026-09-01T00:00:00Z",
      },
      {
        id: 2,
        subject: "Refund request",
        category: "Payment",
        status: "Replied",
        reply: "Refund is on its way",
        createdAt: "2026-09-02T00:00:00Z",
      },
    ]);

    render(<SupportPage />);

    expect(await screen.findByText("Baggage delay")).toBeInTheDocument();
    expect(screen.getByText("Refund request")).toBeInTheDocument();
    expect(screen.getByText("Flight")).toBeInTheDocument();
    expect(screen.getByText("Payment")).toBeInTheDocument();

    fireEvent.click(await screen.findByText("Refund request"));
    expect(await screen.findByText("Refund is on its way")).toBeInTheDocument();
  });

  it("computes pending and replied stat cards", async () => {
    mocks.inquiriesApi.list.mockResolvedValue([
      { id: 1, subject: "A", status: "Pending", createdAt: "" },
      { id: 2, subject: "B", status: "Replied", createdAt: "" },
      { id: 3, subject: "C", status: "Pending", createdAt: "" },
    ]);

    render(<SupportPage />);

    expect(await screen.findByText("Pending")).toBeInTheDocument();
  });

  it("submits a new inquiry through the API", async () => {
    mocks.inquiriesApi.list.mockResolvedValue([]);
    mocks.inquiriesApi.create.mockResolvedValue({ id: 1 });

    render(<SupportPage />);

    fireEvent.click(await screen.findByRole("button", { name: /new inquiry/i }));

    fireEvent.change(screen.getByPlaceholderText("Brief description of your issue"), {
      target: { value: "Need help with my booking" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Describe your inquiry in detail..."),
      { target: { value: "My booking reference is not working." } }
    );

    fireEvent.click(screen.getByText("Submit Inquiry"));

    await waitFor(() =>
      expect(mocks.inquiriesApi.create).toHaveBeenCalledWith({
        customerName: "Admin",
        customerEmail: "admin@travelconnect.ph",
        subject: "Need help with my booking",
        category: "General",
        message: "My booking reference is not working.",
        status: "Pending",
      })
    );
  });

  it("does not submit an empty inquiry", async () => {
    mocks.inquiriesApi.list.mockResolvedValue([]);

    render(<SupportPage />);
    fireEvent.click(await screen.findByRole("button", { name: /new inquiry/i }));
    fireEvent.click(screen.getByText("Submit Inquiry"));

    expect(mocks.inquiriesApi.create).not.toHaveBeenCalled();
  });
});