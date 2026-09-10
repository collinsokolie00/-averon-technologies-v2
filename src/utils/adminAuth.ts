import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
  type UserCredential,
} from "firebase/auth";

import { firebaseAuth } from "../lib/firebase";

export interface AdminSession {
  uid: string;
  email: string;
  name: string;
  role: "owner" | "admin";
}

export function isAdminRole(role: unknown): role is AdminSession["role"] {
  return role === "owner" || role === "admin";
}

export async function getAdminSession(user: User): Promise<AdminSession | null> {
  const token = await user.getIdTokenResult();
  const role = token.claims.role;

  if (!isAdminRole(role)) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email ?? "",
    name: user.displayName || user.email?.split("@")[0] || "Averon Admin",
    role,
  };
}

export function watchAdminAuth(onChange: (payload: { user: User | null; session: AdminSession | null }) => void) {
  return onIdTokenChanged(firebaseAuth, async (user) => {
    onChange({ user, session: user ? await getAdminSession(user) : null });
  });
}

export function loginAdmin(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export function logoutAdmin() {
  return signOut(firebaseAuth);
}
