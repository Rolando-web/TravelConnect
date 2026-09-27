import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CancellationQueuePage from "./CancellationQueuePage";

const mocks = vi.hoisted(() => ({
  api: { cancellationReviewApi: { list: vi.fn(), get: vi.fn(), approve: vi.fn(), reject: vi.fn() } },
  role: { current: "Super Admin" },
}));

vi.mock("react-router-dom", () => ({
  useOutletContext: () => ({ role: mocks.role.current }),
}));

vi.mock("../../services/api", () => mocks.api);

const request = (overrides = {}) => ({
  id: 11,
  reference: "CANC-2026-000011",
  bookingId: 7,
  customerName: "Juan Dela Cruz",
  customerEmail: "juan@tc.com",
  status: "Cancellation Requested",
  reasonCode: "illness",
  reason: "",
  requestedAt: "2026-06-11T07:00:00Z",
  decidedAt: null,
  approvedBy: "",
  rejectionReason: "",
  policyTier: "late",
  policyName: "Late cancellation (3-7 days before departure)",
  fareType: "Economy",
  refundPercentage: 50,
  requiresApproval: true,
  autoApproved: false,
  isException: false,
  resolution: "cash",
  originalAmount: 10000,
  totalFees: 975,
  refundableAmount: 5000,
  refundAmount: 4025,
  hoursBeforeDeparture: 120,
  hoursSinceBooking: 240,
  pastDeparture: false,
  ...overrides,
});

const queue = (overrides = {}) => ({
  items: [request()],
  total: 1,
  page: 1,
  pageSize: 10,
  canApprove: true,
  canOverrideAmount: true,
  ...overrides,
});

const detail = (overrides = {}) => ({
  cancellation: request(),
  notes: "",
  rejectionReason: "",
  canApprove: true,
  canOverrideAmount: true,
  booking: {
    id: 7,
    referenceNumber: "TC-2026-0001",
    status: "cancellation-requested",
    packageName: "MNL-CEB Flight",
    startDate: "2026-06-15",
    totalAmount: 10000,
    paymentMethod: "gcash",
    paid: true,
  },
  refunds: [],
  ...overrides,
});

beforeEach(() => {
  Object.values(mocks.api.cancellationReviewApi).forEach((fn) => fn.mockReset());
  mocks.api.cancellationReviewApi.list.mockResolvedValue(queue());
  mocks.api.cancellationReviewApi.get.mockResolvedValue(detail());
  mocks.role.current = "Super Admin";
});

describe("CancellationQueuePage", () => {
  it("asks the server for the pending queue on mount", async () => {
    render(<CancellationQueuePage />);

    await waitFor(() => expect(mocks.api.cancellationReviewApi.list).toHaveBeenCalled());
    const query = mocks.api.cancellationReviewApi.list.mock.calls[0][0];
    expect(query).toContain("status=pending");
    expect(query).toContain("pageSize=10");
  });

  it("shows the frozen quote, never a locally recomputed one", async () => {
    render(<CancellationQueuePage />);

    expect(await screen.findByText("CANC-2026-000011")).toBeInTheDocument();
    expect(screen.getByText(/Late cancellation/)).toBeInTheDocument();
    // Shown once in the row and once in the "awaiting review" total.
    expect(screen.getAllByText("₱4,025.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Illness or medical")).toBeInTheDocument();
  });

  it("marks a staff-corrected amount as adjusted", async () => {
    mocks.api.cancellationReviewApi.list.mockResolvedValue(queue({
      items: [request({ isException: true, refundAmount: 2000 })],
    }));

    render(<CancellationQueuePage />);

    expect(await screen.findByText("Adjusted")).toBeInTheDocument();
  });

  it("approves the request without inventing an amount", async () => {
    mocks.api.cancellationReviewApi.approve.mockResolvedValue({ message: "Cancellation approved." });
    render(<CancellationQueuePage />);

    fireEvent.click(await screen.findByText("Approve"));
    fireEvent.change(await screen.findByLabelText(/Internal note/), { target: { value: "Doctor's letter" } });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => expect(mocks.api.cancellationReviewApi.approve).toHaveBeenCalledWith(11, {
      notes: "Doctor's letter",
    }));
    expect(await screen.findByText("Cancellation approved.")).toBeInTheDocument();
  });

  it("sends a corrected amount only when the manager typed one", async () => {
    mocks.api.cancellationReviewApi.approve.mockResolvedValue({ message: "Approved at the corrected amount." });
    render(<CancellationQueuePage />);

    fireEvent.click(await screen.findByText("Approve"));
    fireEvent.change(await screen.findByLabelText(/Corrected amount/), { target: { value: "2500" } });
    fireEvent.change(screen.getByLabelText(/Refund resolution/), { target: { value: "travel-credit" } });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => expect(mocks.api.cancellationReviewApi.approve).toHaveBeenCalledWith(11, {
      notes: undefined,
      resolution: "travel-credit",
      refundAmount: 2500,
    }));
  });

  it("requires a rejection reason before it will send anything", async () => {
    render(<CancellationQueuePage />);

    fireEvent.click(await screen.findByText("Review"));
    fireEvent.click(await screen.findByText("Reject"));
    fireEvent.click(await screen.findByText("Save Changes"));

    await waitFor(() =>
      expect(screen.getByText(/Reason shown to the customer is required/i)).toBeInTheDocument()
    );
    expect(mocks.api.cancellationReviewApi.reject).not.toHaveBeenCalled();
  });

  it("sends the rejection reason the customer will read", async () => {
    mocks.api.cancellationReviewApi.reject.mockResolvedValue({ message: "Cancellation request rejected." });
    render(<CancellationQueuePage />);

    fireEvent.click(await screen.findByText("Review"));
    fireEvent.click(await screen.findByText("Reject"));
    fireEvent.change(await screen.findByLabelText(/Reason shown to the customer/), {
      target: { value: "Fare is non-transferable." },
    });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => expect(mocks.api.cancellationReviewApi.reject).toHaveBeenCalledWith(11, {
      reason: "Fare is non-transferable.",
    }));
    expect(await screen.findByText("Cancellation request rejected.")).toBeInTheDocument();
  });

  it("hides the decision buttons from a read-only role", async () => {
    mocks.role.current = "Finance Staff";
    mocks.api.cancellationReviewApi.list.mockResolvedValue(queue({ canApprove: false, canOverrideAmount: false }));

    render(<CancellationQueuePage />);

    expect(await screen.findByText("Read-only access")).toBeInTheDocument();
    expect(screen.getByText("View only")).toBeInTheDocument();
    expect(screen.queryByText("Approve")).toBeNull();
  });

  it("switches view and searches the queue through the API", async () => {
    render(<CancellationQueuePage />);
    await screen.findByText("CANC-2026-000011");

    fireEvent.click(screen.getByText("Rejected"));
    await waitFor(() =>
      expect(mocks.api.cancellationReviewApi.list.mock.calls.at(-1)[0]).toContain("status=Cancellation+Rejected")
    );

    fireEvent.change(screen.getByLabelText("Search cancellation requests"), { target: { value: "maria" } });
    await waitFor(() =>
      expect(mocks.api.cancellationReviewApi.list.mock.calls.at(-1)[0]).toContain("search=maria")
    );
  });

  it("reports a server failure instead of showing an empty queue", async () => {
    mocks.api.cancellationReviewApi.list.mockRejectedValue(new Error("You do not have permission to decide cancellation requests."));

    render(<CancellationQueuePage />);

    expect(await screen.findByText(/You do not have permission/)).toBeInTheDocument();
  });

  it("surfaces the server's message when a decision is refused", async () => {
    mocks.api.cancellationReviewApi.approve.mockRejectedValue(new Error("This request was already Cancellation Approved"));
    render(<CancellationQueuePage />);

    fireEvent.click(await screen.findByText("Approve"));
    fireEvent.click(await screen.findByText("Save Changes"));

    expect(await screen.findByText(/already Cancellation Approved/)).toBeInTheDocument();
  });

  it("shows the empty state when nothing is awaiting review", async () => {
    mocks.api.cancellationReviewApi.list.mockResolvedValue(queue({ items: [], total: 0 }));

    render(<CancellationQueuePage />);

    expect(await screen.findByText("Nothing in this view.")).toBeInTheDocument();
  });

  it("shows the frozen breakdown and any raised refund in the detail view", async () => {
    mocks.api.cancellationReviewApi.get.mockResolvedValue(detail({
      refunds: [{ id: 1, reference: "RFND-2026-000044", status: "Pending", method: "gcash", amount: 4025 }],
    }));

    render(<CancellationQueuePage />);

    fireEvent.click(await screen.findByText("Review"));

    expect(await screen.findByText("What the customer was quoted")).toBeInTheDocument();
    expect(screen.getByText("₱10,000.00")).toBeInTheDocument();
    expect(screen.getByText("- ₱975.00")).toBeInTheDocument();
    expect(screen.getByText(/RFND-2026-000044/)).toBeInTheDocument();
    expect(screen.getByText(/₱4,025\.00 · Pending · gcash/)).toBeInTheDocument();
  });
});
