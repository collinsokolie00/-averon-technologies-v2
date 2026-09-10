import type { WorkspaceContext, WorkspacePermission, WorkspaceRole, WorkspaceSummary } from "@averon/shared-types";
import { ApiError } from "../../errors/api-error.ts";
import type { AuthContext } from "../../services/auth/authentication.ts";
import { businessOsPermissions, rolePermissions, type WorkspaceRepository } from "./workspace.types.ts";

function summary(item: Awaited<ReturnType<WorkspaceRepository["resolve"]>> & {}): WorkspaceSummary {
  return { workspace: item.workspace, business: item.business, role: item.membership.role, permissions: rolePermissions[item.membership.role] };
}
export class WorkspaceAuthorizationService {
  private readonly repository: WorkspaceRepository;
  constructor(repository: WorkspaceRepository) { this.repository = repository; }
  async list(auth: AuthContext) { return { items: (await this.repository.listForUser(auth.user.userId)).map(summary) }; }
  async resolve(auth: AuthContext, workspaceId: string): Promise<WorkspaceContext> {
    const item = await this.repository.resolve(auth.user.userId, workspaceId);
    if (!item) throw new ApiError(403, "WORKSPACE_ACCESS_DENIED", "Access to this workspace is not allowed.");
    return { ...summary(item), userId: auth.user.userId, membershipId: item.membership.id };
  }
  async requirePermission(auth: AuthContext, workspaceId: string, permission: WorkspacePermission) {
    const context = await this.resolve(auth, workspaceId); if (!context.permissions.includes(permission)) throw new ApiError(403, "WORKSPACE_PERMISSION_DENIED", "The workspace permission is required."); return context;
  }
  async requireBusinessOsPermission(auth: AuthContext, workspaceId: string, permission: "business-os:read" | "business-os:manage" | "business-os:restricted-read") {
    const context = await this.resolve(auth, workspaceId); if (!businessOsPermissions[context.role].includes(permission)) throw new ApiError(403, "BUSINESS_OS_PERMISSION_DENIED", "The Business OS permission is required."); return context;
  }
  async addMember(auth: AuthContext, workspaceId: string, body: unknown) {
    const actor = await this.requirePermission(auth, workspaceId, "workspace:manage"); const input = body as Record<string, unknown>;
    const role = input?.role as WorkspaceRole; if (!input || Object.keys(input).some((key) => !["userId", "role"].includes(key)) || typeof input.userId !== "string" || !["owner", "admin", "member", "viewer"].includes(role)) throw new ApiError(400, "INVALID_MEMBERSHIP", "A valid userId and workspace role are required.");
    if (role === "owner" && actor.role !== "owner") throw new ApiError(403, "PRIVILEGE_ESCALATION_DENIED", "Only a workspace owner may grant owner access.");
    return this.repository.addMember({ userId: input.userId, workspaceId, role, actorId: auth.user.userId });
  }
  repositoryForRoutes() { return this.repository; }
}
