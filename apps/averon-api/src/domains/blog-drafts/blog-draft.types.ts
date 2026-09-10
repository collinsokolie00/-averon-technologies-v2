import type { BlogDraft } from "@averon/shared-types";

export type BlogDraftCreatePayload = Pick<BlogDraft, "title" | "slug" | "excerpt" | "body"> & Partial<Pick<BlogDraft, "seoTitle" | "metaDescription" | "tags">>;
export type BlogDraftUpdatePatch = Partial<BlogDraftCreatePayload>;
export interface BlogDraftRepository {
  get(workspaceId: string, draftId: string): Promise<BlogDraft | null>;
  create(actionId: string, input: BlogDraftCreatePayload & { workspaceId: string; businessId: string; actorId: string }): Promise<{ draft: BlogDraft; duplicate: boolean }>;
  update(actionId: string, workspaceId: string, draftId: string, patch: BlogDraftUpdatePatch, actorId: string): Promise<{ draft: BlogDraft; duplicate: boolean }>;
}
