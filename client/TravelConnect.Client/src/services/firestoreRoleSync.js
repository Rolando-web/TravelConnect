import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Keeps the Firestore users/{uid}.role in sync with a System Users role change
 * so the admin menu (AuthContext.resolveRole) reflects it immediately — the
 * System Users table alone never changed what the user actually sees, because
 * the menu role is resolved from the Firestore profile keyed by Firebase uid.
 *
 * Firestore docs are keyed by Firebase uid while System Users know accounts by
 * email, so we match by email and update every matching profile. It is a safe
 * no-op when the account has not signed in yet (no profile = nothing to sync).
 *
 * @returns number of Firestore profiles updated (0 when nothing changed).
 */
export async function syncRoleToFirestore(email, role) {
  if (!email || !role) return 0;

  try {
    const snap = await getDocs(
      query(collection(db, "users"), where("email", "==", email.trim()))
    );

    let updated = 0;
    for (const item of snap.docs) {
      await setDoc(doc(db, "users", item.id), { role }, { merge: true });
      updated++;
    }
    return updated;
  } catch (err) {
    console.warn("Role→Firestore sync skipped:", err.message);
    return 0;
  }
}