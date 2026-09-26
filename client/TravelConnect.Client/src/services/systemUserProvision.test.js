import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  doc: vi.fn((_db, collection, id) => ({ collection, id })),
  setDoc: vi.fn(),
  usersApi: { create: vi.fn() },
}));

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword,
}));
vi.mock("firebase/firestore", () => ({
  doc: mocks.doc,
  setDoc: mocks.setDoc,
}));
vi.mock("./firebase", () => ({
  auth: { type: "mock-auth" },
  db: { type: "mock-db" },
}));
vi.mock("./api", () => ({
  usersApi: mocks.usersApi,
}));

import {
  createSystemUser,
  normalizeAuthError,
} from "./systemUserProvision";

const validForm = {
  displayName: "New Staff",
  email: "staff@travelconnect.com",
  password: "secret123",
  phone: "+63 917 555 9999",
  role: "Agency Staff",
  department: "Operations",
  status: "Active",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createUserWithEmailAndPassword.mockResolvedValue({ user: { uid: "UID-1" } });
  mocks.usersApi.create.mockResolvedValue({ id: 42 });
  mocks.setDoc.mockResolvedValue();
});

describe("createSystemUser (login is impossible without this)", () => {
  it("creates the Firebase Auth credential with the trimmed email + password", async () => {
    await createSystemUser({ ...validForm, email: "  staff@travelconnect.com  " });

    expect(mocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      { type: "mock-auth" },
      "staff@travelconnect.com",
      "secret123"
    );
  });

  it("saves the backend row with the Firebase uid and never leaks the password", async () => {
    await createSystemUser(validForm);

    expect(mocks.usersApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: "New Staff",
        email: "staff@travelconnect.com",
        role: "Agency Staff",
        firebaseUid: "UID-1",
      })
    );
    const saved = mocks.usersApi.create.mock.calls[0][0];
    expect(saved).not.toHaveProperty("password");
  });

  it("writes the Firestore users/{uid} profile with the role so the menu resolves", async () => {
    await createSystemUser(validForm);

    expect(mocks.doc).toHaveBeenCalledWith({ type: "mock-db" }, "users", "UID-1");
    expect(mocks.setDoc).toHaveBeenCalledWith(
      { collection: "users", id: "UID-1" },
      expect.objectContaining({ role: "Agency Staff", email: "staff@travelconnect.com" }),
      { merge: true }
    );
  });

  it("does NOT save a backend row when the email is already registered", async () => {
    mocks.createUserWithEmailAndPassword.mockRejectedValue({
      code: "auth/email-already-in-use",
    });

    await expect(createSystemUser(validForm)).rejects.toThrow(
      "already registered as a sign-in account"
    );
    expect(mocks.usersApi.create).not.toHaveBeenCalled();
  });

  it("surfaces which step failed when the backend row cannot be saved", async () => {
    mocks.usersApi.create.mockRejectedValue(new Error("500 on create"));

    await expect(createSystemUser(validForm)).rejects.toThrow(/System Users record failed/);
    expect(mocks.createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
  });

  it("requires an email and a temporary password", async () => {
    await expect(createSystemUser({ ...validForm, email: "" })).rejects.toThrow(/Email is required/);
    await expect(createSystemUser({ ...validForm, password: "" })).rejects.toThrow(/temporary password/);
    expect(mocks.createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });
});

describe("normalizeAuthError", () => {
  it("keeps known Firebase codes readable", () => {
    expect(normalizeAuthError({ code: "auth/weak-password" })).toMatch(/6 characters/);
    expect(normalizeAuthError({ code: "auth/operation-not-allowed" })).toMatch(/not enabled/);
  });

  it("falls back to the raw message", () => {
    expect(normalizeAuthError({ message: "boom" })).toBe("boom");
  });
});