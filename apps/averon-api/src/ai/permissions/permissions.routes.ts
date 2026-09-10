import type { AuthContext } from "../../services/auth/authentication.ts";
import type { WorkspacePermissionProjectionService } from "./permissions.service.ts";
export async function handleWorkspacePermissionsRoute(input: { method: string; path: string; auth: AuthContext; service: WorkspacePermissionProjectionService }) { const match = /^\/api\/v1\/workspaces\/([^/]+)\/permissions$/.exec(input.path); if (!match || input.method !== "GET") return null; return { status: 200, data: await input.service.get(input.auth, decodeURIComponent(match[1]!)) }; }
