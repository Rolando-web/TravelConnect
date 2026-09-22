import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HelpdeskInboxPage from "./HelpdeskInboxPage";

const mocks = vi.hoisted(() => ({
  supportAdminApi: {
    inbox: vi.fn(),
    thread: vi.fn(),
    reply: vi.fn(),
    replyEmail: vi.fn(),
    read: vi.fn(),
    emails: vi.fn(),
    assign: vi.fn(),
    setStatus: vi.fn(),
    status: vi.fn(),
    agents: vi.fn(),
  },
}));

vi.mock("../../services/api", () => ({
  supportAdminApi: mocks.supportAdminApi,
}));

const threadPayload = {
  subject: "Booking problem",
  customerName: "Juan D.",
  customerEmail: "juan@tc.com",
  status: "Open",
  assigneeEmail: "",
  messages: [
    { id: 1, senderType: "customer", senderName: "Juan", body: "My flight is delayed" },
    { id: 2, senderType: "agent", senderName: "Support", body: "We are checking now" },
  ],
};

beforeEach(() => {
  Object.values(mocks.supportAdminApi).forEach((fn) => fn.mockReset());
  mocks.supportAdminApi.inbox.mockResolvedValue([
    {
      id: 5,
      subject: "Booking problem",
      customerName: "Juan D.",
      status: "Open",
      assigneeEmail: "",
      unreadByAgent: 1,
      lastMessagePreview: "My flight is delayed",
    },
  ]);
  mocks.supportAdminApi.agents.mockResolvedValue([
    { email: "staff@tc.com", name: "Agency Staff", role: "Agency Staff" },
    { email: "super@tc.com", name: "Super Admin", role: "Super Admin" },
  ]);
  mocks.supportAdminApi.thread.mockResolvedValue(threadPayload);
  mocks.supportAdminApi.read.mockResolvedValue(undefined);
  mocks.supportAdminApi.setStatus.mockResolvedValue(undefined);
  mocks.supportAdminApi.reply.mockResolvedValue({ id: 9 });
  mocks.supportAdminApi.assign.mockResolvedValue(undefined);
});

describe("HelpdeskInboxPage", () => {
  it("renders the helpdesk with inbox tickets", async () => {
    render(<HelpdeskInboxPage />);

    expect(screen.getByText("Multi-Agent Helpdesk")).toBeInTheDocument();
    expect(await screen.findByText("Booking problem")).toBeInTheDocument();
  });

  it("populates the assign roster from /api/support/agents (bug #1 regression)", async () => {
    render(<HelpdeskInboxPage />);

    const card = await screen.findByText("Booking problem");
    fireEvent.click(card);

    await screen.findByText("My flight is delayed");

    await waitFor(() => {
      const select = screen.getAllByRole("combobox")[0];
      fireEvent.change(select, { target: { value: "staff@tc.com" } });
    });

    expect(mocks.supportAdminApi.assign).toHaveBeenCalledWith(5, {
      assigneeEmail: "staff@tc.com",
      status: "Open",
    });
    expect(mocks.supportAdminApi.agents).toHaveBeenCalled();
  });

  it("shows thread messages for the selected ticket", async () => {
    render(<HelpdeskInboxPage />);

    fireEvent.click(await screen.findByText("Booking problem"));

    expect(await screen.findByText("We are checking now")).toBeInTheDocument();
  });

  it("sends a reply through the API", async () => {
    mocks.supportAdminApi.inbox.mockResolvedValue([]);
    mocks.supportAdminApi.agents.mockResolvedValue([]);
    mocks.supportAdminApi.thread.mockResolvedValue(threadPayload);
    mocks.supportAdminApi.inbox.mockResolvedValue([
      { id: 5, subject: "Booking problem", customerName: "Juan D.", status: "Open", assigneeEmail: "", lastMessagePreview: "x" },
    ]);
    mocks.supportAdminApi.reply.mockResolvedValue({ id: 9 });

    render(<HelpdeskInboxPage />);
    fireEvent.click(await screen.findByText("Booking problem"));

    const replyBtn = await screen.findByRole("button", { name: /send/i });
    expect(replyBtn).toBeDisabled();

    const textarea = screen.getByPlaceholderText("Reply as agent…");
    fireEvent.change(textarea, { target: { value: "Resolved, thank you" } });
    fireEvent.click(replyBtn);

    await waitFor(() =>
      expect(mocks.supportAdminApi.reply).toHaveBeenCalledWith(5, {
        body: "Resolved, thank you",
      })
    );
  });
});