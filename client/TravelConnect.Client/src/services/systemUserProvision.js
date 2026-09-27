import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { usersApi } from "./api";

/**
 * Turns Firebase auth errors (SDK codes or REST sign-up messages) into plain
 * sentences an admin can act on.
 */
export function normalizeAuthError(err, fallback = "") {
  const code = err?.code || "";
  if (code === "auth/email-already-in-use")
    return "That email is already registered as a sign-in account. Use a different email.";
  if (code === "auth/invalid-email") return "That email address is not valid.";
  if (code === "auth/weak-password")
    return "Password must be at least 6 characters.";
  if (code === "auth/operation-not-allowed")
    return "Email/password sign-in is not enabled for this Firebase project.";
  if (code === "auth/network-request-failed")
    return "Could not reach Firebase to create the sign-in account. Try again.";
  if (fallback) return fallback;
  return err?.message || "Failed to create the Firebase sign-in credential";
}

function restSignUpCode(message = "") {
  const m = String(message);
  if (m === "EMAIL_EXISTS") return "auth/email-already-in-use";
  if (m === "INVALID_EMAIL") return "auth/invalid-email";
  if (m === "WEAK_PASSWORD" || m.startsWith("WEAK_PASSWORD"))
    return "auth/weak-password";
  if (m === "OPERATION_NOT_ALLOWED") return "auth/operation-not-allowed";
  if (m === "TOO_MANY_ATTEMPTS_TRY_LATER") return "auth/network-request-failed";
  if (m) return "";
  return null;
}

/**
 * Creates a System User end-to-end so the account can ACTUALLY sign in.
 *
 * Root cause this fixes: opening the backend row is a managers-only call, and
 * createUserWithEmailAndPassword() signs the NEW user in, silently replacing
 * the admin's session — so the follow-up usersApi.create() was authorized as
 * the brand-new non-manager and got Forbid 403 ("Sign-in account created, but
 * saving the System Users record failed"). We provision the credential through
 * Firebase's REST sign-up endpoint instead, which does NOT touch the current
 * session, so the admin's token still authorizes the backend row save.
 *
 * IMPORTANT: do NOT switch back to createUserWithEmailAndPassword here — it
 * swaps auth.currentUser and re-introduces the 403.
 *
 * @returns {Promise<{ firebaseUid: string }>}
 */
export async function createSystemUser(form = {}) {
  const { password, ...user } = form;
  const email = String(user.email || "").trim();

  if (!email) throw new Error("Email is required to create a sign-in account");
  if (!password) throw new Error("A temporary password is required so the user can sign in");

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

  let data;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      }
    );
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.error?.message || "";
      const code = restSignUpCode(message);
      throw new Error(normalizeAuthError({ code }, message || "Failed to create the sign-in account"));
    }
  } catch (err) {
    if (err instanceof Error && err.message && err.message !== "Failed to fetch")
      throw err;
    throw new Error(
      normalizeAuthError({ code: "auth/network-request-failed" }),
      { cause: err }
    );
  }

  const firebaseUid = data?.localId;
  if (!firebaseUid)
    throw new Error("Firebase did not return an account id for the new user");

  try {
    await usersApi.create({ ...user, email, firebaseUid });
  } catch (err) {
    throw new Error(
      `Sign-in account created, but saving the System Users record failed (${err?.message || "unknown"}) — delete the Firebase account or re-run with a different email.`,
      { cause: err }
    );
  }

  try {
    await setDoc(
      doc(db, "users", firebaseUid),
      {
        email,
        displayName: user.displayName || "",
        phone: user.phone || "",
        role: user.role || "Supplier",
        department: user.department || "",
        status: user.status || "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    // Non-fatal: the account can still sign in. The role lives in
    // Firestore users/{uid}.role, so a failed write means the user lands as
    // Customer until an admin re-applies the role. Mirrors
    // syncRoleToFirestore's posture.
    console.warn("System-user Firestore profile write skipped:", err.message);
  }

  return { firebaseUid };
}