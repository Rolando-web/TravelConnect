import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CancellationPolicyPage from "./CancellationPolicyPage";
import { previewRefund } from "../../data/cancellationPolicyPreview";

const mocks = vi.hoisted(() => ({
  api: { cancellationPolicyApi: { get: vi.fn(), saveSettings: vi.fn(), createRule: vi.fn(), updateRule: vi.fn(), deactivateRule: vi.fn(), reset: vi.fn() } },
  uploadImage: vi.fn(),
  assetUrl: (u) => u,
}));

vi.mock("react-router-dom", () => ({
  useOutletContext: () => ({ role: "Super Admin" }),
}));

vi.mock("../../services/api", () => mocks.api);

const SETTINGS = {
  id: 1,
  name: "Default Cancellation Policy",
  gracePeriodHours: 24,
  autoApproveGracePeriod: true,
  requireApprovalLateCancellation: true,
  requireApprovalNoShow: true,
  requireApprovalNonRefundable: true,
  nonRefundableResolution: "Travel Credit",
  allowTravelCredit: true,
  travelCreditValidityMonths: 12,
  allowAmountOverride: true,
  maxRefundOverridePercent: 100,
  requireCancellationReason: true,
  updatedBy: "admin@travelconnect.ph",
  updatedAt: "2026-06-11T09:00:00Z",
};

const RULES = [
  {
    id: 1,
    name: "Grace period — 100% refund",
    policyTier: "grace",
    refundPercentage: 100,
    airlineFeePercent: 0,
    agencyServiceFee: 0,
    paymentProcessingFee: 0,
    requiresApproval: false,
    resolution: "Cash",
    isActive: true,
    priority: 100,
  },
  {
    id: 2,
    name: "Early cancellation (7+ days before departure)",
    policyTier: "early",
    refundPercentage: 100,
    airlineFeePercent: 15,
    airlineFeeAmount: 0,
    agencyServiceFee: 500,
    paymentProcessingFee: 100,
    requiresApproval: false,
    resolution: "Cash",
    isActive: true,
    priority: 50,
    minHoursBeforeDeparture: 168,
    maxHoursBeforeDeparture: 0,
  },
  {
    id: 3,
    name: "Non-refundable fare — travel credit only",
    policyTier: "non-refundable",
    fareType: "Non-Refundable",
    refundPercentage: 0,
    isNonRefundable: true,
    requiresApproval: true,
    resolution: "Travel Credit",
    isActive: true,
    priority: 90,
  },
];

const policy = (overrides = {}) => ({ settings: SETTINGS, rules: RULES, canManage: true, ...overrides });

beforeEach(() => {
  Object.values(mocks.api.cancellationPolicyApi).forEach((fn) => fn.mockReset());
  mocks.api.cancellationPolicyApi.get.mockResolvedValue(policy());
  window.confirm = vi.fn(() => true);
});

describe("CancellationPolicyPage", () => {
  it("renders the server-backed policy, not local defaults", async () => {
    render(<CancellationPolicyPage />);

    expect(await screen.findByText("Cancellation & Refund Policy")).toBeInTheDocument();
    expect(screen.getByDisplayValue("24")).toBeInTheDocument();
    // Each rule name shows in the table and again in the refund preview.
    expect((await screen.findAllByText("Grace period — 100% refund")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Early cancellation (7+ days before departure)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Non-refundable fare — travel credit only").length).toBeGreaterThan(0);
  });

  it("shows the audit trail of who last changed the policy", async () => {
    render(<CancellationPolicyPage />);

    expect(await screen.findByText("admin@travelconnect.ph")).toBeInTheDocument();
  });

  it("saves an edited grace period to the server and reloads", async () => {
    mocks.api.cancellationPolicyApi.saveSettings.mockResolvedValue({});
    mocks.api.cancellationPolicyApi.get
      .mockResolvedValueOnce(policy())
      .mockResolvedValueOnce(policy({ settings: { ...SETTINGS, gracePeriodHours: 72 } }));

    render(<CancellationPolicyPage />);

    const grace = await screen.findByDisplayValue("24");
    fireEvent.change(grace, { target: { value: "72" } });
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(mocks.api.cancellationPolicyApi.saveSettings).toHaveBeenCalledTimes(1));
    expect(mocks.api.cancellationPolicyApi.saveSettings.mock.calls[0][0].gracePeriodHours).toBe(72);
    await waitFor(() => expect(screen.getByDisplayValue("72")).toBeInTheDocument());
  });

  it("toggles a switch before saving", async () => {
    mocks.api.cancellationPolicyApi.saveSettings.mockResolvedValue({});
    render(<CancellationPolicyPage />);

    const sw = await screen.findByRole("switch", { name: "Auto-approve grace-period cancellations" });
    expect(sw).toHaveAttribute("aria-checked", "true");
    fireEvent.click(sw);
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(mocks.api.cancellationPolicyApi.saveSettings).toHaveBeenCalled());
    expect(mocks.api.cancellationPolicyApi.saveSettings.mock.calls[0][0].autoApproveGracePeriod).toBe(false);
  });

  it("keeps everything read-only when the role cannot manage the policy", async () => {
    mocks.api.cancellationPolicyApi.get.mockResolvedValue(policy({ canManage: false }));

    render(<CancellationPolicyPage />);

    expect(await screen.findByText("Read-only access")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add rule/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("adds a rule and maps the approval select to a tri-state boolean", async () => {
    mocks.api.cancellationPolicyApi.createRule.mockResolvedValue({});
    render(<CancellationPolicyPage />);

    fireEvent.click(await screen.findByRole("button", { name: /add rule/i }));

    fireEvent.change(await screen.findByLabelText(/rule name/i), { target: { value: "Promo fare" } });
    fireEvent.change(screen.getByLabelText("Approval"), { target: { value: "true" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(mocks.api.cancellationPolicyApi.createRule).toHaveBeenCalledTimes(1));
    const body = mocks.api.cancellationPolicyApi.createRule.mock.calls[0][0];
    expect(body.name).toBe("Promo fare");
    expect(body.requiresApproval).toBe(true);
    // Untouched fields fall back to the page defaults so a rule is never invalid.
    expect(body.policyTier).toBe("early");
    expect(body.refundPercentage).toBe(100);
  });

  it("submits null when the approval field is left inherited", async () => {
    mocks.api.cancellationPolicyApi.createRule.mockResolvedValue({});
    render(<CancellationPolicyPage />);

    fireEvent.click(await screen.findByRole("button", { name: /add rule/i }));
    fireEvent.change(await screen.findByLabelText(/rule name/i), { target: { value: "Inherits approval" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(mocks.api.cancellationPolicyApi.createRule).toHaveBeenCalled());
    expect(mocks.api.cancellationPolicyApi.createRule.mock.calls[0][0].requiresApproval).toBeNull();
  });

  it("edits an existing rule through the update endpoint", async () => {
    mocks.api.cancellationPolicyApi.updateRule.mockResolvedValue({});
    render(<CancellationPolicyPage />);

    fireEvent.click((await screen.findAllByRole("button", { name: "Edit" }))[0]);

    fireEvent.change(await screen.findByLabelText(/rule name/i), { target: { value: "Grace period — 100% refund v2" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(mocks.api.cancellationPolicyApi.updateRule).toHaveBeenCalledTimes(1));
    expect(mocks.api.cancellationPolicyApi.updateRule.mock.calls[0][0]).toBe(1);
  });

  it("deactivates a rule instead of deleting it", async () => {
    mocks.api.cancellationPolicyApi.deactivateRule.mockResolvedValue({});
    render(<CancellationPolicyPage />);

    fireEvent.click((await screen.findAllByRole("button", { name: "Deactivate" }))[0]);

    await waitFor(() => expect(mocks.api.cancellationPolicyApi.deactivateRule).toHaveBeenCalledWith(1));
  });

  it("restores the shipped defaults on request", async () => {
    mocks.api.cancellationPolicyApi.reset.mockResolvedValue({});
    render(<CancellationPolicyPage />);

    fireEvent.click(await screen.findByRole("button", { name: /restore defaults/i }));

    await waitFor(() => expect(mocks.api.cancellationPolicyApi.reset).toHaveBeenCalledTimes(1));
  });

  it("surfaces a load failure instead of silently showing defaults", async () => {
    mocks.api.cancellationPolicyApi.get.mockRejectedValue(new Error("API unavailable"));

    render(<CancellationPolicyPage />);

    expect(await screen.findByText("API unavailable")).toBeInTheDocument();
  });

  it("previews the refund a rule would produce", () => {
    // ₱10,000 − 15% (₱1,500) − ₱500 − ₱100 = ₱7,900
    expect(previewRefund(RULES[1], 10000)).toBe(7900);
    expect(previewRefund(RULES[0], 10000)).toBe(10000);
    expect(previewRefund(RULES[2], 10000)).toBe(0);
  });

  it("previews a rule whose fees exceed the refund as zero, never negative", () => {
    const harsh = { refundPercentage: 10, airlineFeePercent: 0, airlineFeeAmount: 0, agencyServiceFee: 5000, paymentProcessingFee: 0, otherFee: 0 };
    expect(previewRefund(harsh, 10000)).toBe(0);
  });
});
