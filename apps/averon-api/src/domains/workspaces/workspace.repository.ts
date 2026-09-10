import type { DocumentData, Firestore } from "firebase-admin/firestore";
import type { Business, Workspace, WorkspaceMembership, WorkspaceRole } from "@averon/shared-types";
import { ApiError } from "../../errors/api-error.ts";
import { getFirebaseAdminServices } from "../../services/firebase/admin.ts";
import { canonicalTenancy, type WorkspaceRepository } from "./workspace.types.ts";

function membershipId(userId: string, workspaceId: string) { return `${workspaceId}__${userId}`; }
function data<T>(snapshot: { id: string; data(): DocumentData | undefined }): T { return { id: snapshot.id, ...snapshot.data() } as T; }

export class FirebaseWorkspaceRepository implements WorkspaceRepository {
  private readonly db: Firestore;
  constructor(db: Firestore = getFirebaseAdminServices().firestore) { this.db = db; }
  private async entities(workspaceId: string) {
    const workspaceDoc = await this.db.collection("workspaces").doc(workspaceId).get();
    if (!workspaceDoc.exists) return null;
    const workspace = data<Workspace>(workspaceDoc);
    const businessDoc = await this.db.collection("businesses").doc(workspace.businessId).get();
    return businessDoc.exists ? { workspace, business: data<Business>(businessDoc) } : null;
  }
  async listForUser(userId: string) {
    const memberships = await this.db.collection("workspaceMemberships").where("userId", "==", userId).where("status", "==", "active").get();
    const resolved = await Promise.all(memberships.docs.map(async (doc) => {
      const membership = data<WorkspaceMembership>(doc); const entities = await this.entities(membership.workspaceId);
      return entities && entities.workspace.status === "active" && entities.business.status === "active" ? { membership, ...entities } : null;
    }));
    return resolved.filter((item): item is NonNullable<typeof item> => Boolean(item));
  }
  async resolve(userId: string, workspaceId: string) {
    const member = await this.db.collection("workspaceMemberships").doc(membershipId(userId, workspaceId)).get();
    if (!member.exists) return null;
    const membership = data<WorkspaceMembership>(member); if (membership.userId !== userId || membership.workspaceId !== workspaceId || membership.status !== "active") return null;
    const entities = await this.entities(workspaceId); if (!entities || entities.workspace.status !== "active" || entities.business.status !== "active") return null;
    return { membership, ...entities };
  }
  async listMembers(workspaceId: string) {
    const result = await this.db.collection("workspaceMemberships").where("workspaceId", "==", workspaceId).get();
    return result.docs.map((doc) => data<WorkspaceMembership>(doc));
  }
  async addMember(input: { userId: string; workspaceId: string; role: WorkspaceRole; actorId: string }) {
    const entities = await this.entities(input.workspaceId); if (!entities) throw new ApiError(404, "WORKSPACE_NOT_FOUND", "The workspace was not found.");
    try { await getFirebaseAdminServices().auth.getUser(input.userId); } catch { throw new ApiError(404, "MEMBERSHIP_USER_NOT_FOUND", "The target user was not found."); }
    const id = membershipId(input.userId, input.workspaceId); const ref = this.db.collection("workspaceMemberships").doc(id);
    if ((await ref.get()).exists) throw new ApiError(409, "MEMBERSHIP_EXISTS", "The workspace membership already exists.");
    const now = getFirebaseAdminServices().serverTimestamp();
    await ref.set({ userId: input.userId, workspaceId: input.workspaceId, businessId: entities.business.id, role: input.role, status: "active", createdAt: now, updatedAt: now });
    await this.db.collection("auditLogs").add({ actorId: input.actorId, action: "WORKSPACE_MEMBERSHIP_CREATED", targetCollection: "workspaceMemberships", targetId: id, workspaceId: input.workspaceId, businessId: entities.business.id, createdAt: now });
    return { id, userId: input.userId, workspaceId: input.workspaceId, businessId: entities.business.id, role: input.role, status: "active" } as WorkspaceMembership;
  }
  async updateMember(input: { membershipId: string; workspaceId: string; role?: WorkspaceRole; status?: "active" | "disabled"; actorId: string }) {
    const ref = this.db.collection("workspaceMemberships").doc(input.membershipId); const found = await ref.get();
    if (!found.exists) throw new ApiError(404, "MEMBERSHIP_NOT_FOUND", "The workspace membership was not found.");
    const membership = data<WorkspaceMembership>(found); if (membership.workspaceId !== input.workspaceId) throw new ApiError(404, "MEMBERSHIP_NOT_FOUND", "The workspace membership was not found.");
    if (membership.role === "owner" && (input.status === "disabled" || (input.role && input.role !== "owner"))) {
      const owners = (await this.listMembers(input.workspaceId)).filter((item) => item.role === "owner" && item.status === "active");
      if (owners.length <= 1) throw new ApiError(409, "FINAL_WORKSPACE_OWNER", "The final active workspace owner cannot be disabled.");
    }
    const now = getFirebaseAdminServices().serverTimestamp();
    await ref.update({ ...(input.role ? { role: input.role } : {}), ...(input.status ? { status: input.status } : {}), updatedAt: now });
    await this.db.collection("auditLogs").add({ actorId: input.actorId, action: "WORKSPACE_MEMBERSHIP_UPDATED", targetCollection: "workspaceMemberships", targetId: input.membershipId, workspaceId: membership.workspaceId, businessId: membership.businessId, createdAt: now });
    return { ...membership, ...(input.role ? { role: input.role } : {}), ...(input.status ? { status: input.status } : {}) };
  }
  async bootstrapOwner(userId: string) {
    const now = getFirebaseAdminServices().serverTimestamp(); let created = 0;
    for (const definition of canonicalTenancy) {
      const businessRef = this.db.collection("businesses").doc(definition.business.id); const workspaceRef = this.db.collection("workspaces").doc(definition.workspace.id);
      if (!(await businessRef.get()).exists) await businessRef.create({ ...definition.business, createdAt: now, updatedAt: now });
      if (!(await workspaceRef.get()).exists) await workspaceRef.create({ ...definition.workspace, createdAt: now, updatedAt: now });
      const memberRef = this.db.collection("workspaceMemberships").doc(membershipId(userId, definition.workspace.id));
      if (!(await memberRef.get()).exists) { await memberRef.create({ userId, workspaceId: definition.workspace.id, businessId: definition.business.id, role: "owner", status: "active", createdAt: now, updatedAt: now }); created += 1; }
    }
    return created;
  }
}
