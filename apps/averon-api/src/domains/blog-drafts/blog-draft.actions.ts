import type { ActionSettlement } from "@averon/agent-contracts";
import type { BlogDraft, BlogDraftActionMetadata } from "@averon/shared-types";
import { ApiError } from "../../errors/api-error.ts";
import { log } from "../../logger.ts";
import type { AuthContext } from "../../services/auth/authentication.ts";
import type { WorkspaceAuthorizationService } from "../workspaces/workspace.service.ts";
import { parseBlogDraftCreate, parseBlogDraftUpdate } from "./blog-draft.schemas.ts";
import type { BlogDraftRepository } from "./blog-draft.types.ts";

export interface ActionDiagnostic { event: "action.requested" | "action.authorized" | "action.started" | "action.completed" | "action.failed" | "action.verification_failed"; actionId: string; workspaceId: string; actionType: string; draftId?: string; status: string; durationMs?: number; errorCode?: string; verificationStatus: "pending" | "passed" | "failed" }
export class ActionDiagnosticsStore { private readonly entries: ActionDiagnostic[] = []; add(entry: ActionDiagnostic) { const safe = structuredClone(entry); this.entries.push(safe); log(entry.event === "action.completed" ? "info" : "warn", "blog_action", { ...safe }); } list() { return this.entries.map((item) => structuredClone(item)); } }

function equalValue(left: unknown, right: unknown) { return JSON.stringify(left) === JSON.stringify(right); }
export class BlogDraftActionService {
  private readonly repository: BlogDraftRepository; private readonly workspaces: WorkspaceAuthorizationService; private readonly diagnostics: ActionDiagnosticsStore;
  constructor(repository: BlogDraftRepository, workspaces: WorkspaceAuthorizationService, diagnostics = new ActionDiagnosticsStore()) { this.repository = repository; this.workspaces = workspaces; this.diagnostics = diagnostics; }
  private event(entry: ActionDiagnostic) { this.diagnostics.add(entry); }
  private async authorize(auth: AuthContext, workspaceId: string, permission: "content:read" | "content:manage") { try { return await this.workspaces.requirePermission(auth, workspaceId, permission); } catch (caught) { if (caught instanceof ApiError && caught.code === "WORKSPACE_PERMISSION_DENIED") throw new ApiError(403, "ACTION_FORBIDDEN", "This workspace action is not allowed."); throw caught; } }
  async read(auth: AuthContext, workspaceId: string, draftId: string) { await this.authorize(auth, workspaceId, "content:read"); const draft = await this.repository.get(workspaceId, draftId); if (!draft) throw new ApiError(404, "BLOG_DRAFT_NOT_FOUND", "The blog draft was not found."); return draft; }
  async create(auth: AuthContext, actionId: string, workspaceId: string, payload: unknown): Promise<{ settlement: ActionSettlement<BlogDraft>; metadata: BlogDraftActionMetadata }> {
    const started = Date.now(); const actionType = "blog.draft.create" as const; this.event({ event: "action.requested", actionId, workspaceId, actionType, status: "requested", verificationStatus: "pending" });
    try { const actor = await this.authorize(auth, workspaceId, "content:manage"); this.event({ event: "action.authorized", actionId, workspaceId, actionType, status: "authorized", verificationStatus: "pending" }); const parsed = parseBlogDraftCreate(payload); this.event({ event: "action.started", actionId, workspaceId, actionType, status: "executing", verificationStatus: "pending" }); const written = await this.repository.create(actionId, { ...parsed, workspaceId, businessId: actor.business.id, actorId: auth.user.userId }); const readBack = await this.repository.get(workspaceId, written.draft.id); const verified = Boolean(readBack && readBack.workspaceId === workspaceId && readBack.id === written.draft.id && readBack.status === "draft" && readBack.published === false && Object.entries(parsed).every(([key, value]) => equalValue(readBack[key as keyof BlogDraft], value))); if (!verified || !readBack) { this.event({ event: "action.verification_failed", actionId, workspaceId, actionType, draftId: written.draft.id, status: "failed", durationMs: Date.now() - started, errorCode: "ACTION_VERIFICATION_FAILED", verificationStatus: "failed" }); throw new ApiError(500, "ACTION_VERIFICATION_FAILED", "The persisted blog draft could not be verified."); } this.event({ event: "action.completed", actionId, workspaceId, actionType, draftId: readBack.id, status: "completed", durationMs: Date.now() - started, verificationStatus: "passed" }); return { settlement: { actionId, status: "completed", result: readBack, verification: { status: "passed", checks: ["workspace", "draft_id", "payload", "unpublished"] }, startedAt: new Date(started).toISOString(), finishedAt: new Date().toISOString() }, metadata: { actionId, actionType, status: "completed", verificationStatus: "passed", draftId: readBack.id, specialists: [], warnings: written.duplicate ? ["Idempotent replay returned the existing draft."] : [] } }; } catch (caught) { const error = caught instanceof ApiError ? caught : new ApiError(500, "ACTION_EXECUTION_FAILED", "The blog draft action failed."); if (error.code !== "ACTION_VERIFICATION_FAILED") this.event({ event: "action.failed", actionId, workspaceId, actionType, status: "failed", durationMs: Date.now() - started, errorCode: error.code, verificationStatus: "failed" }); throw error; }
  }
  async update(auth: AuthContext, actionId: string, workspaceId: string, draftId: string, patch: unknown): Promise<{ settlement: ActionSettlement<BlogDraft>; metadata: BlogDraftActionMetadata }> {
    const started = Date.now(); const actionType = "blog.draft.update" as const; this.event({ event: "action.requested", actionId, workspaceId, actionType, draftId, status: "requested", verificationStatus: "pending" });
    try { await this.authorize(auth, workspaceId, "content:manage"); const parsed = parseBlogDraftUpdate(patch); this.event({ event: "action.authorized", actionId, workspaceId, actionType, draftId, status: "authorized", verificationStatus: "pending" }); this.event({ event: "action.started", actionId, workspaceId, actionType, draftId, status: "executing", verificationStatus: "pending" }); const written = await this.repository.update(actionId, workspaceId, draftId, parsed, auth.user.userId); const readBack = await this.repository.get(workspaceId, draftId); const verified = Boolean(readBack && readBack.id === draftId && readBack.workspaceId === workspaceId && readBack.status === "draft" && readBack.published === false && Object.entries(parsed).every(([key, value]) => equalValue(readBack[key as keyof BlogDraft], value))); if (!verified || !readBack) { this.event({ event: "action.verification_failed", actionId, workspaceId, actionType, draftId, status: "failed", durationMs: Date.now() - started, errorCode: "ACTION_VERIFICATION_FAILED", verificationStatus: "failed" }); throw new ApiError(500, "ACTION_VERIFICATION_FAILED", "The persisted blog draft could not be verified."); } this.event({ event: "action.completed", actionId, workspaceId, actionType, draftId, status: "completed", durationMs: Date.now() - started, verificationStatus: "passed" }); return { settlement: { actionId, status: "completed", result: readBack, verification: { status: "passed", checks: ["workspace", "draft_id", "patch", "unpublished"] }, startedAt: new Date(started).toISOString(), finishedAt: new Date().toISOString() }, metadata: { actionId, actionType, status: "completed", verificationStatus: "passed", draftId, specialists: [], warnings: written.duplicate ? ["Idempotent replay returned the existing update."] : [] } }; } catch (caught) { const error = caught instanceof ApiError ? caught : new ApiError(500, "ACTION_EXECUTION_FAILED", "The blog draft action failed."); if (error.code !== "ACTION_VERIFICATION_FAILED") this.event({ event: "action.failed", actionId, workspaceId, actionType, draftId, status: "failed", durationMs: Date.now() - started, errorCode: error.code, verificationStatus: "failed" }); throw error; }
  }
  unsupported(actionType: string): never { throw new ApiError(400, "ACTION_UNSUPPORTED", `${actionType} is not supported.`); }
}

function draftIdFrom(value: string) {
  const labeled = /\bdraft\s+id\s*[:#]?\s*([A-Za-z0-9_-]{4,128})\b/i.exec(value)?.[1];
  const bare = /\bdraft\s+([A-Za-z0-9_-]{8,128})\b/i.exec(value)?.[1];
  return labeled ?? (bare && (bare.length >= 20 || /[\d_-]/.test(bare)) ? bare : undefined);
}

export function explicitBlogDraftIntent(message: string, history: readonly { role: "user" | "assistant"; content: string }[] = []) {
  const create = /\b(?:create|prepare|make)\s+(?:me\s+)?(?:an?\s+)?(?:new\s+)?(?:unpublished\s+)?(?:(?:seo|seo[- ]friendly|optimized)\s+)?(?:blog\s+draft|blog\s+post|article\s+draft|article|post|draft)\b/i.test(message)
    || /\bwrite\s+(?:me\s+)?(?:an?\s+)?(?:unpublished\s+)?(?:(?:seo[- ]friendly|optimized)\s+)?(?:blog(?:\s+post)?|article|post|draft)\b/i.test(message)
    || /\bdraft\s+(?:me\s+)?(?:an?\s+)?(?:unpublished\s+)?(?:blog|article|post)\b/i.test(message);
  const advisory = /\b(?:how\s+(?:could|can|should)|what\s+(?:could|should)|recommend|suggest|ideas?|thoughts?)\b/i.test(message);
  const directUpdate = /\b(?:update|edit|revise|rewrite)\s+(?:the\s+|this\s+|that\s+)?(?:unpublished\s+)?(?:(?:blog|article)\s+)?draft\b/i.test(message);
  const field = /\b(?:title|headline|call\s+to\s+action|cta|meta\s+description|seo\s+title|slug|excerpt|body|content|copy)\b/i;
  const hardFieldMutation = /\b(?:change|set|strengthen|rewrite|revise|edit|update|optimi[sz]e)\b/i.test(message) && field.test(message);
  const improveField = !advisory && /\bimprove\b/i.test(message) && field.test(message);
  const update = directUpdate || hardFieldMutation || improveField;
  if (create) return { action: "create" as const, explicit: true };
  if (update) {
    const draftId = draftIdFrom(message) ?? [...history].reverse().map((item) => draftIdFrom(item.content)).find(Boolean);
    return { action: "update" as const, explicit: true, draftId };
  }
  return { action: "none" as const, explicit: false };
}
