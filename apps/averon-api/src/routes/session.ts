import type { ApiSuccess } from "@averon/shared-types";
import { requireAdmin } from "../services/auth/authorization.ts";
import type { AuthContext } from "../services/auth/authentication.ts";

export interface SafeSession {
  userId: string;
  email?: string;
  displayName?: string;
  role: "user" | "admin" | "owner";
  isAdmin: boolean;
}

export function sessionResponse(auth: AuthContext, requestId: string): ApiSuccess<SafeSession> {
  const { userId, email, displayName, role, isAdmin } = auth.user;
  return { success: true, data: { userId, email, displayName, role, isAdmin }, requestId };
}

export function adminSessionResponse(auth: AuthContext, requestId: string): ApiSuccess<SafeSession & { permissions: string[] }> {
  requireAdmin(auth);
  const base = sessionResponse(auth, requestId).data;
  return { success: true, data: { ...base, permissions: auth.user.permissions }, requestId };
}
