import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SupportHubPage from "./SupportHubPage";

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

vi.mock("react-router-dom", () => ({
  useOutletContext: () => ({ role: "Super Admin" }),
}));

beforeEach(() => {
  Object.values(adminApi).forEach((fn) => fn.mockReset());
});

describe("admin SupportHubPage", () => {
  it("shows a friendly offline message when the API host is unreachable", async () => {
    adminApi.inbox.mockRejectedValue(new Error("Request failed (404)"));

    render(<SupportHubPage />);

    expect(await screen.findByText(/isn't reachable from this preview/i)).toBeInTheDocument();
    expect(screen.getByText(/Refresh to retry/i)).toBeInTheDocument();
  });

  it("shows a friendly offline message on a network failure", async () => {
    adminApi.inbox.mockRejectedValue(new Error("Failed to fetch"));

    render(<SupportHubPage />);

    expect(await screen.findByText(/isn't reachable from this preview/i)).toBeInTheDocument();
  });

  it("lists tier inquiries with subject and customer", async () => {
    adminApi.inbox.mockResolvedValue([
      {
        id: 1,
        customerName: "Dela Cruz",
        customerEmail: "d@example.com",
        subject: "Basic tier question",
        status: "Open",
        lastMessagePreview: "Hello",
        lastMessageAt: "2026-09-01T00:00:00Z",
      },
    ]);

    render(<SupportHubPage />);

    expect(await screen.findByText("Basic tier question")).toBeInTheDocument();
    expect(screen.getByText(/Dela Cruz/)).toBeInTheDocument();
  });

  it("shows the empty state when there are no tier inquiries", async () => {
    adminApi.inbox.mockResolvedValue([]);

    render(<SupportHubPage />);

    expect(await screen.findByText(/No tier inquiries yet/i)).toBeInTheDocument();
  });

  it("inserts a pre-made quick reply into the reply box", async () => {
    adminApi.inbox.mockResolvedValue([
      {
        id: 5,
        customerName: "Maria Santos",
        customerEmail: "maria@example.com",
        subject: "Tier question",
        status: "Open",
        lastMessagePreview: "what does pro include",
        lastMessageAt: "2026-09-01T00:00:00Z",
      },
    ]);
    adminApi.thread.mockResolvedValue({
      id: 5,
      subject: "Tier question",
      customerName: "Maria Santos",
      customerEmail: "maria@example.com",
      status: "Open",
      messages: [
        {
          id: 1,
          senderType: "customer",
          senderName: "Maria Santos",
          body: "What is included in the Tier 2 Professional plan and how much does it cost per month?",
        },
      ],
    });
    adminApi.read.mockResolvedValue(undefined);

    render(<SupportHubPage />);

    fireEvent.click(await screen.findByText("Tier question"));

    const textarea = await screen.findByPlaceholderText(/Reply as Super Admin/);
    fireEvent.click(screen.getByRole("button", { name: /Tier 2 Professional/i }));

    expect(textarea.value).toContain("Professional");
    expect(textarea.value).toContain("7,999/month");
  });

  it("appends a quick reply to an existing draft", async () => {
    adminApi.inbox.mockResolvedValue([
      {
        id: 6,
        customerName: "Ana Cruz",
        customerEmail: "ana@example.com",
        subject: "Payment question",
        status: "Open",
        lastMessagePreview: "gcash",
        lastMessageAt: "2026-09-01T00:00:00Z",
      },
    ]);
    adminApi.thread.mockResolvedValue({
      id: 6,
      subject: "Payment question",
      customerName: "Ana Cruz",
      customerEmail: "ana@example.com",
      status: "Open",
      messages: [{ id: 1, senderType: "customer", senderName: "Ana Cruz", body: "Can I pay with gcash?" }],
    });
    adminApi.read.mockResolvedValue(undefined);

    render(<SupportHubPage />);

    fireEvent.click(await screen.findByText("Payment question"));

    const textarea = await screen.findByPlaceholderText(/Reply as Super Admin/);
    fireEvent.change(textarea, { target: { value: "Thanks for asking!" } });
    fireEvent.click(screen.getByRole("button", { name: /Payment options/i }));

    expect(textarea.value).toContain("Thanks for asking!");
    expect(textarea.value).toContain("GCash");
  });
});