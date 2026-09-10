import type { Permission } from "@averon/shared-types";
import { ApiError } from "../../errors/api-error.ts";
import type { AuthContext } from "./authentication.ts";

export function requireAdmin(context: AuthContext): void {
  if (!context.user.isAdmin) throw new ApiError(403, "INSUFFICIENT_PERMISSIONS", "Administrator access is required.");
}

export function requirePermission(context: AuthContext, permission: Permission): void {
  if (!context.user.isAdmin && !context.user.permissions.includes(permission)) {
    throw new ApiError(403, "INSUFFICIENT_PERMISSIONS", "The authenticated user does not have the required permission.");
  }
}
