import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RefundQueuePage from "./RefundQueuePage";

const mocks = vi.hoisted(() => ({
  api: { refundsApi: { list: vi.fn(), get: vi.fn(), release: vi.fn(), process: vi.fn(), complete: vi.fn(), fail: vi.fn(), retry: vi.fn() } },
  role: { current: "Finance Staff" },
}));

vi.mock("react-router-dom", () => ({
  useOutletContext: () => ({ role: mocks.role.current }),
}));

vi.mock("../../services/api", () => mocks.api);

const refund = (overrides = {}) => ({
  id: 21,
  reference: "RFND-2026-000021",
  cancellationId: 11,
  bookingId: 7,
  paymentId: 5,
  status: "Pending",
  method: "gcash",
  amount: 4025,
  calculatedAmount: 4025,
  originalAmount: 10000,
  totalDeductions: 5975,
  isAdjusted: false,
  refundReference: "",
  requestedBy: "agency@tc.com",
  approvedBy: "",
  approvedAt: null,
  processedAt: null,
  completedAt: null,
  failureReason: "",
  createdAt: "2026-06-11T07:00:00Z",
  customerName: "Juan Dela Cruz",
  customerEmail: "juan@tc.com",
  bookingReference: "TC-2026-0001",
  allowedTransitions: ["Approved", "Rejected", "Voided"],
  ...overrides,
});

const queue = (overrides = {}) => ({
  items: [refund()],
  total: 1,
  page: 1,
  pageSize: 10,
  canProcess: true,
  ...overrides,
});

const detail = (overrides = {}) => ({
  refund: refund(),
  notes: "",
  failureReason: "",
  allowedTransitions: ["Approved", "Rejected", "Voided"],
  canProcess: true,
  booking: {
    id: 7,
    referenceNumber: "TC-2026-0001",
    status: "cancelled",
    cancellationStatus: "Cancellation Approved",
    refundStatus: "Pending",
    paid: false,
    totalAmount: 10000,
    paymentMethod: "gcash",
    startDate: "2026-06-15",
  },
  cancellation: {
    id: 11,
    reference: "CANC-2026-000011",
    status: "Cancellation Approved",
    policyName: "Late cancellation (3-7 days before departure)",
    resolution: "cash",
    refundAmount: 4025,
    totalFees: 5975,
  },
  payment: { id: 5, referenceId: "pay_abc123", method: "gcash", amount: 10000, status: "Paid", paymentDate: "2026-06-01" },
  ...overrides,
});

beforeEach(() => {
  Object.values(mocks.api.refundsApi).forEach((fn) => fn.mockReset());
  mocks.api.refundsApi.list.mockResolvedValue(queue());
  mocks.api.refundsApi.get.mockResolvedValue(detail());
  mocks.role.current = "Finance Staff";
});

describe("RefundQueuePage", () => {
  it("asks the server for the money still to be moved", async () => {
    render(<RefundQueuePage />);

    await waitFor(() => expect(mocks.api.refundsApi.list).toHaveBeenCalled());
    const query = mocks.api.refundsApi.list.mock.calls[0][0];
    expect(query).toContain("status=open");
    expect(query).toContain("pageSize=10");
  });

  it("shows the queued amount and the payment it came from", async () => {
    render(<RefundQueuePage />);

    expect(await screen.findByText("RFND-2026-000021")).toBeInTheDocument();
    // Shown in the row and again in the "still owed" total.
    expect(screen.getAllByText("₱4,025.00").length).toBeGreaterThan(0);
    expect(screen.getByText(/Booking TC-2026-0001/)).toBeInTheDocument();
    expect(screen.getByText("gcash")).toBeInTheDocument();
  });

  it("only offers the step the refund is actually allowed to take", async () => {
    render(<RefundQueuePage />);

    await screen.findByText("RFND-2026-000021");
    expect(screen.getByText("Release")).toBeInTheDocument();
    expect(screen.queryByText("Start payout")).toBeNull();
    expect(screen.queryByText("Complete")).toBeNull();
  });

  it("releases a refund with only the note the user typed", async () => {
    mocks.api.refundsApi.release.mockResolvedValue({ message: "Refund RFND-2026-000021 released for payout." });
    render(<RefundQueuePage />);

    fireEvent.click(await screen.findByText("Release"));
    fireEvent.change(await screen.findByLabelText(/Release note/), { target: { value: "With the morning batch" } });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() =>
      expect(mocks.api.refundsApi.release).toHaveBeenCalledWith(21, { notes: "With the morning batch" })
    );
    expect(await screen.findByText("Refund RFND-2026-000021 released for payout.")).toBeInTheDocument();
  });

  it("sends the provider reference finance typed when starting a payout", async () => {
    mocks.api.refundsApi.list.mockResolvedValue(queue({
      items: [refund({ status: "Approved", allowedTransitions: ["Processing", "Completed", "Failed"] })],
    }));
    mocks.api.refundsApi.process.mockResolvedValue({ message: "Refund RFND-2026-000021 is being processed." });
    render(<RefundQueuePage />);

    fireEvent.click(await screen.findByText("Start payout"));
    fireEvent.change(await screen.findByLabelText(/Provider or remittance reference/), { target: { value: " TRACE-77123 " } });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() =>
      expect(mocks.api.refundsApi.process).toHaveBeenCalledWith(21, { notes: undefined, refundReference: "TRACE-77123" })
    );
  });

  it("never invents a reference when finance leaves it blank", async () => {
    mocks.api.refundsApi.list.mockResolvedValue(queue({
      items: [refund({ status: "Approved", allowedTransitions: ["Processing", "Completed", "Failed"] })],
    }));
    mocks.api.refundsApi.complete.mockResolvedValue({ message: "Refund of 4025.00 completed." });
    render(<RefundQueuePage />);

    fireEvent.click(await screen.findByText("Complete"));
    fireEvent.click(screen.getByText("Save Changes"));

    // The server owns the reference, so the client must not send an empty string
    // that could overwrite a recorded one.
    await waitFor(() =>
      expect(mocks.api.refundsApi.complete).toHaveBeenCalledWith(21, { notes: undefined })
    );
  });

  it("insists on a reason before a failure can be reported", async () => {
    mocks.api.refundsApi.list.mockResolvedValue(queue({
      items: [refund({ status: "Processing", allowedTransitions: ["Completed", "Failed"] })],
    }));
    render(<RefundQueuePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Report failure" }));
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => expect(screen.getByText(/Why the payout failed is required/i)).toBeInTheDocument());
    expect(mocks.api.refundsApi.fail).not.toHaveBeenCalled();
  });

  it("shows why a payout failed and lets finance retry it", async () => {
    mocks.api.refundsApi.list.mockResolvedValue(queue({
      items: [refund({
        status: "Failed",
        failureReason: "GCash account is closed.",
        allowedTransitions: ["Processing"],
      })],
    }));
    mocks.api.refundsApi.retry.mockResolvedValue({ message: "Refund RFND-2026-000021 is being processed again." });
    render(<RefundQueuePage />);

    expect(await screen.findByText("GCash account is closed.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry payout" }));
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => expect(mocks.api.refundsApi.retry).toHaveBeenCalledWith(21, { notes: undefined }));
  });

  it("hides every payout action from a read-only role", async () => {
    mocks.api.refundsApi.list.mockResolvedValue(queue({ canProcess: false }));
    mocks.role.current = "Agency Staff";

    render(<RefundQueuePage />);

    expect(await screen.findByText("Read-only access")).toBeInTheDocument();
    expect(screen.getByText("View only")).toBeInTheDocument();
    expect(screen.queryByText("Release")).toBeNull();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("switches view and searches through the API", async () => {
    render(<RefundQueuePage />);
    await screen.findByText("RFND-2026-000021");

    fireEvent.click(screen.getByText("Failed"));
    await waitFor(() =>
      expect(mocks.api.refundsApi.list.mock.calls.at(-1)[0]).toContain("status=Failed")
    );

    fireEvent.change(screen.getByLabelText("Search refunds"), { target: { value: "maria" } });
    await waitFor(() => expect(mocks.api.refundsApi.list.mock.calls.at(-1)[0]).toContain("search=maria"));
  });

  it("shows the payout trail and the linked payment in the detail view", async () => {
    render(<RefundQueuePage />);

    fireEvent.click(await screen.findByText("Open"));

    expect(await screen.findByText("What is owed")).toBeInTheDocument();
    expect(screen.getByText("- ₱5,975.00")).toBeInTheDocument();
    expect(screen.getByText("pay_abc123")).toBeInTheDocument();
    expect(screen.getByText("Payout trail")).toBeInTheDocument();
  });

  it("reports a server failure instead of pretending the queue is empty", async () => {
    mocks.api.refundsApi.list.mockRejectedValue(new Error("You do not have permission to process refunds."));

    render(<RefundQueuePage />);

    expect(await screen.findByText(/do not have permission/)).toBeInTheDocument();
  });

  it("surfaces the server's refusal when a payout step is refused", async () => {
    mocks.api.refundsApi.release.mockRejectedValue(new Error("This refund is already Approved."));
    render(<RefundQueuePage />);

    fireEvent.click(await screen.findByText("Release"));
    fireEvent.click(screen.getByText("Save Changes"));

    expect(await screen.findByText(/already Approved/)).toBeInTheDocument();
  });

  it("shows the empty state when finance has nothing to settle", async () => {
    mocks.api.refundsApi.list.mockResolvedValue(queue({ items: [], total: 0 }));

    render(<RefundQueuePage />);

    expect(await screen.findByText("Nothing in this view.")).toBeInTheDocument();
  });
});
