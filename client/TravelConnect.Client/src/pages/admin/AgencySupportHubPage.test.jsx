import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AgencySupportHubPage from "./AgencySupportHubPage";

const adminApi = vi.hoisted(() => ({
  inbox: vi.fn(),
  thread: vi.fn(),
  read: vi.fn(),
  reply: vi.fn(),
  replyEmail: vi.fn(),
  status: vi.fn(),
  emails: vi.fn(),
  assign: vi.fn(),
  agents: vi.fn(),
}));

vi.mock("../../services/api", () => ({ supportAdminApi: adminApi }));

const out = vi.hoisted(() => ({ role: "Agency Admin" }));

vi.mock("react-router-dom", () => ({
  useOutletContext: () => ({ role: out.role }),
}));

beforeEach(() => {
  Object.values(adminApi).forEach((fn) => fn.mockReset());
  out.role = "Agency Admin";
});

describe("admin AgencySupportHubPage", () => {
  it("lists the agency's customer problems with subject and customer", async () => {
    adminApi.inbox.mockResolvedValue([
      {
        id: 1,
        customerName: "Reyes",
        customerEmail: "r@example.com",
        subject: "Refund request",
        status: "Open",
        lastMessagePreview: "Please refund",
        lastMessageAt: "2026-09-01T00:00:00Z",
      },
    ]);

    render(<AgencySupportHubPage />);

    expect(await screen.findByText("Refund request")).toBeInTheDocument();
    expect(screen.getByText(/Reyes/)).toBeInTheDocument();
  });

  it("shows the empty state when there are no customer problems", async () => {
    adminApi.inbox.mockResolvedValue([]);

    render(<AgencySupportHubPage />);

    expect(await screen.findByText(/No customer problems yet/i)).toBeInTheDocument();
  });

  it("shows the gate message to non-Agency-Admin roles", async () => {
    out.role = "Super Admin";

    render(<AgencySupportHubPage />);

    expect(screen.getByText(/handled by the Agency Admin only/i)).toBeInTheDocument();
  });

  it("shows the gate message to Agency Staff", async () => {
    out.role = "Agency Staff";

    render(<AgencySupportHubPage />);

    expect(screen.getByText(/handled by the Agency Admin only/i)).toBeInTheDocument();
  });

  it("sends a chat reply as the Agency Admin", async () => {
    adminApi.inbox.mockResolvedValue([
      {
        id: 7,
        customerName: "Ana Cruz",
        customerEmail: "ana@example.com",
        subject: "Missing booking",
        status: "Open",
        lastMessagePreview: "I didn't get a receipt",
        lastMessageAt: "2026-09-01T00:00:00Z",
      },
    ]);
    adminApi.thread.mockResolvedValue({
      id: 7,
      subject: "Missing booking",
      customerName: "Ana Cruz",
      customerEmail: "ana@example.com",
      status: "Open",
      messages: [
        { id: 1, senderType: "customer", senderName: "Ana Cruz", body: "I didn't get a receipt" },
      ],
    });
    adminApi.read.mockResolvedValue(undefined);
    adminApi.reply.mockResolvedValue({ id: 9 });

    render(<AgencySupportHubPage />);

    fireEvent.click(await screen.findByText("Missing booking"));

    const textarea = await screen.findByPlaceholderText(/Reply as Agency Admin/);
    fireEvent.change(textarea, { target: { value: "Resending your receipt now." } });
    fireEvent.click(screen.getByRole("button", { name: /Chat/ }));

    expect(await screen.findByText(/Reply sent to the customer's chat/i)).toBeInTheDocument();
    expect(adminApi.reply).toHaveBeenCalledWith(7, { body: "Resending your receipt now." });
  });

  it("shows a friendly offline message when the API host is unreachable", async () => {
    adminApi.inbox.mockRejectedValue(new Error("Request failed (404)"));

    render(<AgencySupportHubPage />);

    expect(await screen.findByText(/isn't reachable from this preview/i)).toBeInTheDocument();
  });
});