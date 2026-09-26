import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminManagementPage from "./AdminManagementPage";

const mocks = vi.hoisted(() => ({
  outletCtx: { access: { users: "Manage" }, role: "Super Admin" },
  api: {
    usersApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    flightsApi: { list: vi.fn() },
    hotelsApi: { list: vi.fn() },
    carsApi: { list: vi.fn() },
    activitiesApi: { list: vi.fn() },
    inquiriesApi: { list: vi.fn() },
    destinationsApi: { list: vi.fn() },
    suppliersApi: { list: vi.fn() },
    promotionsApi: { list: vi.fn() },
    leadsApi: { list: vi.fn() },
    uploadImage: vi.fn(),
    assetUrl: (u) => u,
  },
  createSystemUser: vi.fn(),
  syncRoleToFirestore: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ page: "users" }),
  useOutletContext: () => mocks.outletCtx,
}));

vi.mock("../../services/api", () => mocks.api);
vi.mock("../../services/systemUserProvision", () => ({
  createSystemUser: mocks.createSystemUser,
}));
vi.mock("../../services/firestoreRoleSync", () => ({
  syncRoleToFirestore: mocks.syncRoleToFirestore,
}));

vi.mock("./ProfilePage", () => ({ default: () => null }));
vi.mock("./SupportPage", () => ({ default: () => null }));
vi.mock("./SystemSettingsPage", () => ({ default: () => null }));
vi.mock("./HelpdeskInboxPage", () => ({ default: () => null }));

beforeEach(() => {
  mocks.outletCtx.role = "Super Admin";
  mocks.api.usersApi.list.mockReset();
  mocks.api.usersApi.update.mockReset();
  mocks.createSystemUser.mockReset();
  mocks.syncRoleToFirestore.mockReset();
  mocks.api.usersApi.list.mockResolvedValue([]);
  mocks.createSystemUser.mockResolvedValue({ firebaseUid: "UID-1" });
  mocks.syncRoleToFirestore.mockResolvedValue(0);
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const renderUsers = () => render(<AdminManagementPage />);

// The modal labels aren't htmlFor-linked to their inputs; resolve the input
// through the label's wrapping field div instead.
const inputFor = (label) =>
  screen.getByText(label).parentElement.querySelector("input,select,textarea");

const openAddUser = async () => {
  renderUsers();
  fireEvent.click(await screen.findByRole("button", { name: /add user/i }));
};

describe("AdminManagementPage System Users", () => {
  it("lists users with the Add User action for Manage access", async () => {
    mocks.api.usersApi.list.mockResolvedValue([
      { id: 1, displayName: "Maria Santos", email: "admin@travelconnect.com", role: "Agency Admin", status: "Active" },
    ]);

    renderUsers();

    expect(await screen.findByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add user/i })).toBeInTheDocument();
  });

  it("requires a temporary password when adding a user (no sign-in credential otherwise)", async () => {
    await openAddUser();

    fireEvent.change(inputFor("Name"), { target: { value: "New Staff" } });
    fireEvent.change(inputFor("Email"), { target: { value: "staff@tc.com" } });
    fireEvent.change(inputFor("Role"), { target: { value: "Agency Staff" } });

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(
      await screen.findByText("Temporary Password is required")
    ).toBeInTheDocument();
    expect(mocks.createSystemUser).not.toHaveBeenCalled();
  });

  it("provisions the auth account + backend row through createSystemUser on add", async () => {
    await openAddUser();

    fireEvent.change(inputFor("Name"), { target: { value: "New Staff" } });
    fireEvent.change(inputFor("Email"), { target: { value: "staff@tc.com" } });
    fireEvent.change(inputFor("Role"), { target: { value: "Agency Staff" } });
    fireEvent.change(inputFor("Department"), { target: { value: "Operations" } });
    fireEvent.change(inputFor("Temporary Password"), {
      target: { value: "secret123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(mocks.createSystemUser).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "New Staff",
          email: "staff@tc.com",
          role: "Agency Staff",
          department: "Operations",
          password: "secret123",
        })
      )
    );
    expect(mocks.api.usersApi.create).not.toHaveBeenCalled();
  });

  it("surfaces a Firebase provisioning failure via alert and keeps the modal open", async () => {
    mocks.createSystemUser.mockRejectedValue(
      new Error("That email is already registered as a sign-in account. Use a different email.")
    );

    await openAddUser();

    fireEvent.change(inputFor("Name"), { target: { value: "Dup" } });
    fireEvent.change(inputFor("Email"), { target: { value: "dup@tc.com" } });
    fireEvent.change(inputFor("Temporary Password"), { target: { value: "secret123" } });

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(window.alert).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Temporary Password")).toBeInTheDocument();
  });

  it("edits the backend row and syncs the new role to Firestore (no auth re-provision)", async () => {
    mocks.api.usersApi.list.mockResolvedValue([
      { id: 7, displayName: "Ana Garcia", email: "supplier@travelconnect.com", role: "Supplier", status: "Active" },
    ]);

    renderUsers();
    fireEvent.click(await screen.findByText("Edit"));

    fireEvent.change(inputFor("Role"), { target: { value: "Agency Staff" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mocks.api.usersApi.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ id: 7, email: "supplier@travelconnect.com", role: "Agency Staff" })
      )
    );
    await waitFor(() =>
      expect(mocks.syncRoleToFirestore).toHaveBeenCalledWith(
        "supplier@travelconnect.com",
        "Agency Staff"
      )
    );
    expect(mocks.createSystemUser).not.toHaveBeenCalled();
    expect(screen.queryByText("Temporary Password")).not.toBeInTheDocument();
  });

  it("hides privileged roles from an Agency Admin's user form (employees only)", async () => {
    mocks.outletCtx.role = "Agency Admin";

    await openAddUser();

    const select = inputFor("Role");
    const roleOptions = [...select.options].filter((o) => o.value !== "").map((o) => o.text);
    expect(roleOptions).toEqual(["Agency Staff", "Finance Staff", "Supplier"]);
  });

  it("keeps all roles visible to a Super Admin", async () => {
    await openAddUser();

    const select = inputFor("Role");
    const roleOptions = [...select.options].filter((o) => o.value !== "").map((o) => o.text);
    expect(roleOptions).toEqual([
      "Super Admin",
      "Agency Admin",
      "Agency Staff",
      "Finance Staff",
      "Supplier",
    ]);
  });
});