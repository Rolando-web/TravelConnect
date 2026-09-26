import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminLayout from "./AdminLayout";

const mocks = vi.hoisted(() => ({
  auth: { user: { name: "Maria Santos", role: "Agency Admin" }, logout: vi.fn() },
}));

// Route via mock NavLink (href carries the target) and a no-op Outlet.
vi.mock("react-router-dom", () => ({
  NavLink: ({ to, children, className }) => (
    <a href={to} className={typeof className === "function" ? className({ isActive: false }) : className}>
      {children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => mocks.auth,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.user = { name: "Maria Santos", role: "Agency Admin" };
});

describe("AdminLayout role navigation", () => {
  it("renders a System Users item and the Agency Support hub for an Agency Admin", () => {
    render(<AdminLayout />);

    const users = screen.getByRole("link", { name: /system users/i });
    expect(users).toHaveAttribute("href", "/admin/users");

    const support = screen.getByRole("link", { name: /agency support/i });
    expect(support).toHaveAttribute("href", "/admin/agency-support");

    expect(screen.queryByRole("link", { name: /tier support/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /subscriptions/i })).not.toBeInTheDocument();
  });

  it("offers system users, tier support, and subscriptions only to a Super Admin", () => {
    mocks.auth.user = { name: "Juan Dela Cruz", role: "Super Admin" };

    render(<AdminLayout />);

    expect(screen.getByRole("link", { name: /system users/i })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: /tier support/i })).toHaveAttribute("href", "/admin/support-hub");
    expect(screen.getByRole("link", { name: /subscriptions/i })).toHaveAttribute("href", "/admin/subscriptions");
    expect(screen.queryByRole("link", { name: /agency support/i })).not.toBeInTheDocument();
  });

  it("hides the System Users page and support hubs from Agency Staff", () => {
    mocks.auth.user = { name: "Staff", role: "Agency Staff" };

    render(<AdminLayout />);

    expect(screen.queryByRole("link", { name: /system users/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /agency support/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /tier support/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /bookings/i })).toHaveAttribute("href", "/admin/bookings");
  });
});