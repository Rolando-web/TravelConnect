import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { usersApi } from "./api";

/**
 * Turns Firebase SDK errors into plain sentences an admin can act on.
 */
export function normalizeAuthError(err) {
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
  return err?.message || "Failed to create the Firebase sign-in credential";
}

/**
 * Creates a System User end-to-end so the account can ACTUALLY sign in.
 *
 * Root cause this fixes: the System Users page used to insert a row into the
 * backend SQL table only — no Firebase Auth account existed for the email, so
 * signInWithEmailAndPassword always failed with "user-not-found". Creating a
 * user here now:
 *   1. provisions the Firebase Auth credential (email + temporary password),
 *   2. saves the backed row with the new Firebase uid,
 *   3. writes users/{uid}.role to Firestore so the admin menu resolves right
 *      after first sign-in (same source AuthContext.resolveRole reads).
 *
 * @returns {Promise<{ firebaseUid: string }>}
 */
export async function createSystemUser(form = {}) {
  const { password, ...user } = form;
  const email = String(user.email || "").trim();

  if (!email) throw new Error("Email is required to create a sign-in account");
  if (!password) throw new Error("A temporary password is required so the user can sign in");

  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    throw new Error(normalizeAuthError(err), { cause: err });
  }

  const firebaseUid = credential.user.uid;

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
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    // Non-fatal: the account can still sign in. The role lives in
    // Firestore users/{uid}.role, so a failed write means the user lands as
    // Customer until an admin re-applies the role. Mirrors
    // syncRoleToFirestore's posture; rules are permissive enough in practice
    // because role edits already write the same documents.
    console.warn("System-user Firestore profile write skipped:", err.message);
  }

  return { firebaseUid };
}