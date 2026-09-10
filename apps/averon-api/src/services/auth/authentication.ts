import type { DecodedIdToken } from "firebase-admin/auth";
import type { Permission } from "@averon/shared-types";
import { ApiError } from "../../errors/api-error.ts";
import { getFirebaseAdminServices } from "../firebase/admin.ts";

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  displayName?: string;
  emailVerified: boolean;
  role: "user" | "admin" | "owner";
  isAdmin: boolean;
  permissions: Permission[];
}

export interface AuthContext { user: AuthenticatedUser }
export interface TokenVerifier { verifyIdToken(token: string): Promise<DecodedIdToken> }

export class FirebaseTokenVerifier implements TokenVerifier {
  verifyIdToken(token: string) { return getFirebaseAdminServices().auth.verifyIdToken(token); }
}

function tokenError(caught: unknown): ApiError {
  const code = typeof caught === "object" && caught && "code" in caught ? String(caught.code) : "";
  if (code === "auth/id-token-expired") return new ApiError(401, "TOKEN_EXPIRED", "The authentication token has expired.");
  return new ApiError(401, "INVALID_TOKEN", "The authentication token is invalid.");
}

function isPermission(value: unknown): value is Permission {
  return typeof value === "string";
}

export async function authenticateAuthorizationHeader(header: string | undefined, verifier: TokenVerifier): Promise<AuthContext> {
  if (!header) throw new ApiError(401, "MISSING_TOKEN", "Authentication is required.");
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match?.[1]?.trim()) throw new ApiError(401, "INVALID_TOKEN", "The authentication token is malformed.");
  let decoded: DecodedIdToken;
  try { decoded = await verifier.verifyIdToken(match[1].trim()); }
  catch (caught) { throw tokenError(caught); }

  const claimRole = decoded.role;
  const role = claimRole === "owner" || claimRole === "admin" ? claimRole : decoded.admin === true ? "admin" : "user";
  const permissions = Array.isArray(decoded.permissions) ? decoded.permissions.filter(isPermission) : [];
  return { user: {
    userId: decoded.uid,
    email: decoded.email,
    displayName: decoded.name,
    emailVerified: decoded.email_verified === true,
    role,
    isAdmin: role === "owner" || role === "admin",
    permissions,
  } };
}
