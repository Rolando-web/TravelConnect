import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SupportChatWidget } from "./SupportChatWidget";

const mocks = vi.hoisted(() => ({
  authState: {
    isLoggedIn: true,
    user: { email: "c@tc.com" },
    openLoginModal: vi.fn(),
  },
  api: {
    list: vi.fn(),
    create: vi.fn(),
    thread: vi.fn(),
    send: vi.fn(),
    markRead: vi.fn(),
  },
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mocks.authState,
}));

vi.mock("../../services/api", () => ({
  supportApi: mocks.api,
}));

beforeEach(() => {
  mocks.authState.isLoggedIn = true;
  mocks.authState.openLoginModal.mockClear();
  Object.values(mocks.api).forEach((fn) => fn.mockReset());
});

describe("SupportChatWidget", () => {
  it("renders the floating chat bubble", () => {
    render(<SupportChatWidget />);
    expect(screen.getByLabelText("Chat with customer support")).toBeInTheDocument();
  });

  it("shows a red ping when there is an unread customer message", async () => {
    mocks.api.list.mockResolvedValue([{ unreadByCustomer: 2 }]);

    render(<SupportChatWidget />);

    const ping = await screen.findByText("●");
    expect(ping).toBeInTheDocument();
  });

  it("clears the ping when no unread conversations exist", async () => {
    mocks.api.list.mockResolvedValue([]);

    render(<SupportChatWidget />);
    await waitFor(() => expect(mocks.api.list).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("●")).not.toBeInTheDocument());
  });

  it("opens the panel and starts a conversation from a topic when signed in", async () => {
    mocks.api.list.mockResolvedValue([]);
    mocks.api.create.mockResolvedValue({ id: 7 });
    mocks.api.thread.mockResolvedValue({ messages: [] });
    mocks.api.markRead.mockResolvedValue(undefined);

    render(<SupportChatWidget />);
    fireEvent.click(screen.getByLabelText("Chat with customer support"));

    expect(await screen.findByText("What do you need help with?")).toBeInTheDocument();
    fireEvent.click(screen.getByText("General Support"));

    await waitFor(() => {
      expect(mocks.api.create).toHaveBeenCalledWith({
        subject: "General support request",
        category: "General",
      });
    });
    await waitFor(() => expect(mocks.api.markRead).toHaveBeenCalledWith(7));
    expect(screen.getByPlaceholderText("Type your message…")).toBeInTheDocument();
  });

  it("asks guests to sign in instead of starting a thread", () => {
    mocks.authState.isLoggedIn = false;
    mocks.api.list.mockResolvedValue([]);

    render(<SupportChatWidget />);
    fireEvent.click(screen.getByLabelText("Chat with customer support"));

    fireEvent.click(screen.getByText("General Support"));
    expect(mocks.authState.openLoginModal).toHaveBeenCalled();
    expect(mocks.api.create).not.toHaveBeenCalled();
  });

  it("resumes a prior conversation by topic instead of creating a duplicate", async () => {
    mocks.api.list.mockResolvedValue([
      { id: 11, category: "General" },
    ]);
    mocks.api.thread.mockResolvedValue({ messages: [{ id: 1, body: "start", senderType: "customer" }] });
    mocks.api.markRead.mockResolvedValue(undefined);

    render(<SupportChatWidget />);
    fireEvent.click(screen.getByLabelText("Chat with customer support"));

    await screen.findByText("What do you need help with?");
    fireEvent.click(screen.getByText("General Support"));

    await waitFor(() => expect(mocks.api.create).not.toHaveBeenCalled());
    await waitFor(() => expect(mocks.api.thread).toHaveBeenCalledWith(11));
    expect(screen.getByText("start")).toBeInTheDocument();
  });

  it("sends a message with the customer email", async () => {
    mocks.api.list.mockResolvedValue([]);
    mocks.api.create.mockResolvedValue({ id: 7 });
    mocks.api.thread.mockResolvedValue({ messages: [] });
    mocks.api.markRead.mockResolvedValue(undefined);
    mocks.api.send.mockResolvedValue({
      id: 2,
      body: "hello agent",
      senderType: "customer",
      createdAt: new Date().toISOString(),
    });

    render(<SupportChatWidget />);
    fireEvent.click(screen.getByLabelText("Chat with customer support"));
    await screen.findByText("What do you need help with?");
    fireEvent.click(screen.getByText("General Support"));

    const input = await screen.findByPlaceholderText("Type your message…");
    fireEvent.change(input, { target: { value: "hello agent" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    await waitFor(() =>
      expect(mocks.api.send).toHaveBeenCalledWith(7, {
        senderEmail: "c@tc.com",
        body: "hello agent",
      })
    );
    expect(await screen.findByText("hello agent")).toBeInTheDocument();
  });

  it("sends a pre-made tier question in a Subscription conversation", async () => {
    mocks.api.list.mockResolvedValue([]);
    mocks.api.create.mockResolvedValue({ id: 7 });
    mocks.api.thread.mockResolvedValue({ messages: [] });
    mocks.api.markRead.mockResolvedValue(undefined);
    mocks.api.send.mockResolvedValue({
      id: 3,
      body: "What is included in the Tier 2 Professional plan and how much does it cost per month?",
      senderType: "customer",
      createdAt: new Date().toISOString(),
    });

    render(<SupportChatWidget />);
    fireEvent.click(screen.getByLabelText("Chat with customer support"));
    await screen.findByText("What do you need help with?");
    fireEvent.click(screen.getByText("Agency & Tier Plan"));

    expect(await screen.findByText("Common tier questions")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Tier 2 Professional details"));

    await waitFor(() =>
      expect(mocks.api.send).toHaveBeenCalledWith(7, {
        senderEmail: "c@tc.com",
        body: "What is included in the Tier 2 Professional plan and how much does it cost per month?",
      })
    );
  });

  it("does not offer tier questions for a non-Subscription conversation", async () => {
    mocks.api.list.mockResolvedValue([]);
    mocks.api.create.mockResolvedValue({ id: 7 });
    mocks.api.thread.mockResolvedValue({ messages: [] });
    mocks.api.markRead.mockResolvedValue(undefined);

    render(<SupportChatWidget />);
    fireEvent.click(screen.getByLabelText("Chat with customer support"));
    await screen.findByText("What do you need help with?");
    fireEvent.click(screen.getByText("Refund / Problem"));

    await screen.findByPlaceholderText("Type your message…");
    expect(screen.queryByText("Common tier questions")).not.toBeInTheDocument();
  });
});