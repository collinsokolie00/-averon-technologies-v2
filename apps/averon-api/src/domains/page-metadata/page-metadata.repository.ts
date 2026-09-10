import type { PageMetadata, PageMetadataId, SeoMetadataPatch } from "@averon/shared-types";
import { ApiError } from "../../errors/api-error.ts";
import { getFirebaseAdminServices } from "../../services/firebase/admin.ts";
import type { PageMetadataRepository } from "./page-metadata.types.ts";

function recordId(workspaceId: string, pageId: string) { return `${workspaceId}__${pageId.replaceAll(":", "__")}`; }

export class FirebasePageMetadataRepository implements PageMetadataRepository {
  private readonly db;
  constructor(db = getFirebaseAdminServices().firestore) { this.db = db; }
  private collection() { return this.db.collection("pageMetadata"); }
  async get(workspaceId: string, pageId: PageMetadataId) {
    const found = await this.collection().doc(recordId(workspaceId, pageId)).get();
    if (!found.exists) return null;
    const item = found.data() as PageMetadata;
    return item.workspaceId === workspaceId && item.pageId === pageId ? { ...item } : null;
  }
  async getByRoute(workspaceId: string, route: string) {
    const found = await this.collection().where("workspaceId", "==", workspaceId).where("route", "==", route).limit(1).get();
    return found.empty ? null : { ...(found.docs[0].data() as PageMetadata) };
  }
  async seed(records: readonly PageMetadata[]) {
    let created = 0;
    for (const item of records) {
      const reference = this.collection().doc(recordId(item.workspaceId, item.pageId));
      if ((await reference.get()).exists) continue;
      await reference.create({ ...item, updatedAt: getFirebaseAdminServices().serverTimestamp() });
      created += 1;
    }
    return created;
  }
  async update(actionId: string, workspaceId: string, pageId: PageMetadataId, patch: SeoMetadataPatch, actorId: string) {
    const actionRef = this.db.collection("actionExecutions").doc(actionId); const metadataRef = this.collection().doc(recordId(workspaceId, pageId));
    return this.db.runTransaction(async (tx) => { const prior = await tx.get(actionRef); if (prior.exists) { const data = prior.data(); if (data?.workspaceId !== workspaceId || data?.actionType !== "seo.metadata.update" || data?.pageId !== pageId) throw new ApiError(409, "ACTION_IDEMPOTENCY_CONFLICT", "The action ID belongs to another operation."); const existing = await tx.get(metadataRef); if (!existing.exists) throw new ApiError(500, "ACTION_VERIFICATION_FAILED", "The prior metadata action cannot be verified."); return { metadata: existing.data() as PageMetadata, duplicate: true }; } const found = await tx.get(metadataRef); if (!found.exists) throw new ApiError(404, "PAGE_METADATA_NOT_FOUND", "Page metadata was not found."); const current = found.data() as PageMetadata; if (current.workspaceId !== workspaceId || current.pageId !== pageId) throw new ApiError(403, "ACTION_FORBIDDEN", "The metadata target is outside this workspace."); const updated = { ...current, ...patch, version: current.version + 1, updatedAt: new Date().toISOString() }; tx.update(metadataRef, { ...patch, version: updated.version, updatedAt: updated.updatedAt, updatedBy: actorId }); tx.create(actionRef, { actionId, workspaceId, actionType: "seo.metadata.update", pageId, status: "completed", changedFields: Object.keys(patch), createdAt: updated.updatedAt }); tx.create(this.db.collection("auditLogs").doc(), { actorId, action: "SEO_METADATA_UPDATED", targetCollection: "pageMetadata", targetId: pageId, workspaceId, actionId, changedFields: Object.keys(patch), createdAt: updated.updatedAt }); return { metadata: updated, duplicate: false }; });
  }
}
