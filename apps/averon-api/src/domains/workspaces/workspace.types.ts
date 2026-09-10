import type { Business, Workspace, WorkspaceMembership, WorkspacePermission, WorkspaceRole } from "@averon/shared-types";

export const canonicalTenancy = [
  { business: { id: "averon", name: "Averon Technologies", slug: "averon", status: "active" }, workspace: { id: "averon", businessId: "averon", name: "Averon Technologies", slug: "averon", status: "active" } },
  { business: { id: "movento", name: "Movento", slug: "movento", status: "active" }, workspace: { id: "movento", businessId: "movento", name: "Movento", slug: "movento", status: "active" } },
  { business: { id: "lumora", name: "Lumora", slug: "lumora", status: "active" }, workspace: { id: "lumora", businessId: "lumora", name: "Lumora", slug: "lumora", status: "active" } },
] as const satisfies ReadonlyArray<{ business: Business; workspace: Workspace }>;

export const rolePermissions: Record<WorkspaceRole, WorkspacePermission[]> = {
  owner: ["workspace:read", "workspace:manage", "business:read", "customers:read", "customers:manage", "quotes:read", "quotes:manage", "contracts:read", "contracts:manage", "payments:read", "content:read", "content:manage", "source:read", "source:propose", "source:manage", "emmy:use"],
  admin: ["workspace:read", "workspace:manage", "business:read", "customers:read", "customers:manage", "quotes:read", "quotes:manage", "contracts:read", "contracts:manage", "payments:read", "content:read", "content:manage", "source:read", "source:propose", "source:manage", "emmy:use"],
  member: ["workspace:read", "business:read", "customers:read", "quotes:read", "contracts:read", "payments:read", "content:read", "emmy:use"],
  viewer: ["workspace:read", "business:read", "content:read"],
};

export const businessOsPermissions: Record<WorkspaceRole, Array<"business-os:read" | "business-os:manage" | "business-os:restricted-read">> = {
  owner: ["business-os:read", "business-os:manage", "business-os:restricted-read"],
  admin: ["business-os:read", "business-os:manage", "business-os:restricted-read"],
  member: ["business-os:read"],
  viewer: ["business-os:read"],
};

export interface WorkspaceRepository {
  listForUser(userId: string): Promise<Array<{ membership: WorkspaceMembership; workspace: Workspace; business: Business }>>;
  resolve(userId: string, workspaceId: string): Promise<{ membership: WorkspaceMembership; workspace: Workspace; business: Business } | null>;
  listMembers(workspaceId: string): Promise<WorkspaceMembership[]>;
  addMember(input: { userId: string; workspaceId: string; role: WorkspaceRole; actorId: string }): Promise<WorkspaceMembership>;
  updateMember(input: { membershipId: string; workspaceId: string; role?: WorkspaceRole; status?: "active" | "disabled"; actorId: string }): Promise<WorkspaceMembership>;
  bootstrapOwner(userId: string): Promise<number>;
}
