import type { Permission, Role, UserIdentity } from "@averon/shared-types";

export interface AuthSession {
  user: UserIdentity;
  roles: Role[];
  permissions: Permission[];
  tokenExpiresAt?: string;
}

export interface TokenProvider {
  getToken(): Promise<string | null>;
}

export function hasPermission(session: AuthSession | null, permission: Permission): boolean {
  return Boolean(session?.permissions.includes(permission));
}
