import { ApiError } from "../../errors/api-error.ts";
import type { AuthContext } from "../../services/auth/authentication.ts";
import type { BlogDraftActionService } from "./blog-draft.actions.ts";

export async function handleBlogDraftRoute(input: { method: string; path: string; body: unknown; auth: AuthContext; service: BlogDraftActionService; requestId: string }) {
  const match = /^\/api\/v1\/workspaces\/([^/]+)\/blog-drafts(?:\/([^/]+))?(?:\/(publish))?$/.exec(input.path); if (!match) return null; const workspaceId = decodeURIComponent(match[1]); const draftId = match[2] ? decodeURIComponent(match[2]) : undefined;
  if (draftId && !/^[A-Za-z0-9_-]{1,128}$/.test(draftId)) throw new ApiError(400, "ACTION_VALIDATION_FAILED", "The draft ID is invalid.");
  if (match[3]) throw new ApiError(400, "ACTION_UNSUPPORTED", "Publishing is not supported by blog draft actions v1.");
  if (input.method === "GET" && draftId) return { status: 200, data: await input.service.read(input.auth, workspaceId, draftId) };
  if (input.method === "POST" && !draftId) { const body = input.body as Record<string, unknown>; if (!body || Object.keys(body).some((key) => !["actionId", "payload"].includes(key)) || typeof body.actionId !== "string" || !/^[A-Za-z0-9:_-]{1,180}$/.test(body.actionId)) throw new ApiError(400, "ACTION_VALIDATION_FAILED", "A valid actionId and payload are required."); return { status: 201, data: await input.service.create(input.auth, body.actionId, workspaceId, body.payload) }; }
  if (input.method === "PATCH" && draftId) { const body = input.body as Record<string, unknown>; if (!body || Object.keys(body).some((key) => !["actionId", "patch"].includes(key)) || typeof body.actionId !== "string" || !/^[A-Za-z0-9:_-]{1,180}$/.test(body.actionId)) throw new ApiError(400, "ACTION_VALIDATION_FAILED", "A valid actionId and patch are required."); return { status: 200, data: await input.service.update(input.auth, body.actionId, workspaceId, draftId, body.patch) }; }
  throw new ApiError(400, "ACTION_UNSUPPORTED", "This blog draft action is not supported.");
}
