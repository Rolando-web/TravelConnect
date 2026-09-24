import { describe, it, expect, vi, beforeEach } from "vitest";

const firestore = vi.hoisted(() => ({
  collection: vi.fn(() => "collection-ref"),
  doc: vi.fn(() => "doc-ref"),
  getDocs: vi.fn(),
  query: vi.fn((...args) => ["query", ...args]),
  setDoc: vi.fn(),
  where: vi.fn(() => "constraint"),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("./firebase", () => ({ db: { type: "mock-db" } }));

import { syncRoleToFirestore } from "./firestoreRoleSync";

beforeEach(() => {
  Object.values(firestore).forEach((fn) => fn.mockReset());
});

describe("syncRoleToFirestore", () => {
  it("updates every Firestore profile matching the email", async () => {
    firestore.getDocs.mockResolvedValue({ docs: [{ id: "uid-1" }, { id: "uid-2" }] });

    const updated = await syncRoleToFirestore("  admin@travelconnect.com  ", "Agency Admin");

    expect(updated).toBe(2);
    expect(firestore.where).toHaveBeenCalledWith("email", "==", "admin@travelconnect.com");
    expect(firestore.setDoc).toHaveBeenCalledTimes(2);
    expect(firestore.setDoc).toHaveBeenCalledWith("doc-ref", { role: "Agency Admin" }, { merge: true });
  });

  it("returns 0 when no Firestore profile matches", async () => {
    firestore.getDocs.mockResolvedValue({ docs: [] });

    expect(await syncRoleToFirestore("nobody@example.com", "Agency Admin")).toBe(0);
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it("is a no-op when email or role is missing", async () => {
    expect(await syncRoleToFirestore("", "Agency Admin")).toBe(0);
    expect(await syncRoleToFirestore("a@b.c", "")).toBe(0);
    expect(firestore.getDocs).not.toHaveBeenCalled();
  });

  it("swallows Firestore failures and returns 0", async () => {
    firestore.getDocs.mockRejectedValue(new Error("network"));

    expect(await syncRoleToFirestore("admin@travelconnect.com", "Agency Admin")).toBe(0);
  });
});