import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, useEffect } from "react";
import { render } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

const authModule = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

const firestore = vi.hoisted(() => ({
  doc: vi.fn(() => "doc-ref"),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("firebase/auth", () => authModule);
vi.mock("firebase/firestore", () => firestore);
vi.mock("../services/firebase", () => ({
  auth: { type: "mock-auth" },
  googleProvider: { type: "mock-google" },
  db: { type: "mock-db" },
}));

const NETWORK_TIMEOUT_MS = 2000;

let ctxRef = { current: null };
let authCallback;

function Probe() {
  const auth = useAuth();
  useEffect(() => {
    ctxRef.current = auth;
  }, [auth]);
  return <div>{auth.user?.role || "signed-out"}</div>;
}

const getCtx = () => ctxRef.current;

const renderProvider = () => render(<AuthProvider><Probe /></AuthProvider>);

const fbUser = (uid, claims = {}) => ({
  uid,
  email: `${uid}@tc.com`,
  getIdTokenResult: vi.fn().mockResolvedValue({ claims }),
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  ctxRef = { current: null };
  authCallback = undefined;
  authModule.onAuthStateChanged.mockImplementation((auth, cb) => {
    authCallback = cb;
    return () => {};
  });
});

afterEach(() => {
  vi.useRealTimers();
});

const bootSignedOut = async () => {
  await act(async () => {
    if (authCallback) await authCallback(null);
  });
};

describe("AuthContext login performance", () => {
  it("boots as signed-out and finishes loading without a session", async () => {
    renderProvider();
    await bootSignedOut();

    expect(getCtx().loading).toBe(false);
    expect(getCtx().isLoggedIn).toBe(false);
  });

  it("resolves via custom claims within the bounded budget when Firestore hangs", async () => {
    vi.useFakeTimers();
    renderProvider();

    authModule.signInWithEmailAndPassword.mockResolvedValue({ user: fbUser("u-admin", { role: "Agency Admin" }) });
    firestore.getDoc.mockReturnValue(new Promise(() => {})); // never settles
    firestore.setDoc.mockResolvedValue();

    let result;
    await act(async () => {
      const p = getCtx().loginWithEmail("admin@tc.com", "secret1");
      await vi.advanceTimersByTimeAsync(NETWORK_TIMEOUT_MS + 50);
      result = await p;
    });

    expect(result.role).toBe("Agency Admin");
    // the Firestore read was attempted but bounded — never stalls 7s
    expect(firestore.getDoc).toHaveBeenCalledTimes(1);
  });

  it("prefers the Firestore role over claims and persists it", async () => {
    renderProvider();

    authModule.signInWithEmailAndPassword.mockResolvedValue({
      user: fbUser("u-pref", { role: "Super Admin" }),
    });
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "Agency Admin", displayName: "Maria Santos" }),
    });

    let result;
    await act(async () => {
      result = await getCtx().loginWithEmail("admin@tc.com", "secret1");
    });

    expect(result.role).toBe("Agency Admin");
    expect(localStorage.getItem("tc_user")).toContain("Agency Admin");
    expect(authModule.signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
  });

  it("reuses the cached role so the post-login auth-state callback never re-reads Firestore", async () => {
    renderProvider();

    const fb = fbUser("u-dedupe", {});
    authModule.signInWithEmailAndPassword.mockResolvedValue({ user: fb });
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "Finance Staff" }),
    });

    await act(async () => {
      await getCtx().loginWithEmail("u-dedupe@tc.com", "secret1");
    });
    const readsAfterLogin = firestore.getDoc.mock.calls.length;
    expect(readsAfterLogin).toBe(1);

    // The real Firebase SDK fires onAuthStateChanged immediately after a
    // sign-in; that second resolve must hit the role cache, not Firestore.
    await act(async () => {
      await authCallback(fb);
    });
    expect(firestore.getDoc.mock.calls.length).toBe(readsAfterLogin);
  });

  it("clears the role cache on logout so the next login re-reads Firestore", async () => {
    renderProvider();

    const fb = fbUser("u-logout", {});
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "Agency Staff" }),
    });

    await act(async () => {
      await authCallback(fb);
    });
    firestore.getDoc.mockClear();

    await act(async () => {
      await getCtx().logout();
    });
    expect(getCtx().isLoggedIn).toBe(false);
    expect(localStorage.getItem("tc_user")).toBeNull();

    // A fresh login in the same session must hit Firestore again (cache gone).
    authModule.signInWithEmailAndPassword.mockResolvedValue({ user: fb });
    await act(async () => {
      await getCtx().loginWithEmail("u-logout@tc.com", "secret1");
    });
    expect(firestore.getDoc).toHaveBeenCalled();
  });

  it("boots a returning session inside the bounded budget", async () => {
    vi.useFakeTimers();
    renderProvider();

    const fb = fbUser("u-return", {});
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "Customer", displayName: "Pat" }),
    });

    let done = false;
    await act(async () => {
      authCallback(fb).then(() => {
        done = true;
      });
      await vi.advanceTimersByTimeAsync(NETWORK_TIMEOUT_MS + 50);
    });

    expect(done).toBe(true);
    expect(getCtx().user?.role).toBe("Customer");
  });
});