import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SuppliersPage from "./SuppliersPage";

const mocks = vi.hoisted(() => ({
  api: {
    suppliersApi: { list: vi.fn(), create: vi.fn(), update: vi.fn() },
    packagesApi: { list: vi.fn() },
    assetUrl: (u) => u,
    uploadImage: vi.fn(),
  },
}));

vi.mock("react-router-dom", () => ({
  useOutletContext: () => ({ role: "Super Admin" }),
}));

vi.mock("../../services/api", () => mocks.api);

beforeEach(() => {
  mocks.api.suppliersApi.list.mockReset();
  mocks.api.packagesApi.list.mockReset();
  mocks.api.suppliersApi.list.mockResolvedValue([]);
  mocks.api.packagesApi.list.mockResolvedValue([]);
});

describe("SuppliersPage Car + Hotel supplier support", () => {
  it("offers Cars and Hotels as supplier types when adding a supplier", async () => {
    render(<SuppliersPage />);

    fireEvent.click(await screen.findByRole("button", { name: /add supplier/i }));

    expect(screen.getByRole("option", { name: "Car" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Hotel" })).toBeInTheDocument();
  });

  it("renders a Car supplier row and its type filter pill", async () => {
    mocks.api.suppliersApi.list.mockResolvedValue([
      {
        id: 9,
        companyName: "Manila Executive Car Rental",
        contactName: "Daniel Cruz",
        contactEmail: "bookings@manilaexecdrive.ph",
        type: "Car",
        rating: 4.6,
        status: "Active",
      },
    ]);

    render(<SuppliersPage />);

    expect(await screen.findByText("Manila Executive Car Rental")).toBeInTheDocument();
    expect(screen.getAllByText("Car").length).toBeGreaterThan(0);
    const pill = screen.getAllByRole("button", { name: "Car" })[0];
    fireEvent.click(pill);
    expect(screen.getByText("Manila Executive Car Rental")).toBeInTheDocument();
  });
});