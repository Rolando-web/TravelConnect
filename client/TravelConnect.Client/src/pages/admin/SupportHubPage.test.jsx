import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
});