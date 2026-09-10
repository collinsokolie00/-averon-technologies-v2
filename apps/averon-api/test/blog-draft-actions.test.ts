import test from "node:test";
import assert from "node:assert/strict";
import { ActionDiagnosticsStore } from "../src/domains/blog-drafts/blog-draft.actions.ts";
import { MemoryBlogDraftRepository, MemoryWorkspaceRepository, request } from "./http-harness.ts";

const payload = { title: "Safe AI automation", slug: "safe-ai-automation", excerpt: "A practical introduction.", body: "# Safe AI automation\n\nUseful, reviewed draft content.", seoTitle: "Safe AI automation guide", metaDescription: "A practical guide to safe AI automation.", tags: ["automation"] };
function workspaces(role: "owner" | "admin" | "member" | "viewer" = "owner", status: "active" | "disabled" = "active") { return new MemoryWorkspaceRepository({ businesses: [{ id: "averon", name: "Averon", slug: "averon", status: "active" }, { id: "other", name: "Other", slug: "other", status: "active" }], workspaces: [{ id: "averon", businessId: "averon", name: "Averon", slug: "averon", status: "active" }, { id: "other", businessId: "other", name: "Other", slug: "other", status: "active" }], memberships: [{ id: "averon-user", userId: "user-1", workspaceId: "averon", businessId: "averon", role, status }] }); }

test("authorized create is unpublished, verified, readable, and idempotent", async () => {
  const repository = new MemoryBlogDraftRepository(); const workspaceRepository = workspaces();
  const first = await request("/api/v1/workspaces/averon/blog-drafts", { method: "POST", authorization: "Bearer ok", body: { actionId: "action-1", payload }, repository: undefined, workspaceRepository, blogDraftRepository: repository });
  assert.equal(first.status, 201); const draft = (first.payload.data as { settlement: { result: { id: string; published: boolean; status: string } }; metadata: { verificationStatus: string } }).settlement.result;
  assert.equal(draft.published, false); assert.equal(draft.status, "draft"); assert.equal((first.payload.data as { metadata: { verificationStatus: string } }).metadata.verificationStatus, "passed");
  const read = await request(`/api/v1/workspaces/averon/blog-drafts/${draft.id}`, { authorization: "Bearer ok", workspaceRepository, blogDraftRepository: repository }); assert.equal(read.status, 200); assert.equal(read.payload.data.id, draft.id);
  const duplicate = await request("/api/v1/workspaces/averon/blog-drafts", { method: "POST", authorization: "Bearer ok", body: { actionId: "action-1", payload }, workspaceRepository, blogDraftRepository: repository }); assert.equal(duplicate.status, 201); assert.equal(repository.writes, 1);
});

test("authorized update is verified and remains unpublished", async () => {
  const repository = new MemoryBlogDraftRepository(); const workspaceRepository = workspaces();
  const created = await request("/api/v1/workspaces/averon/blog-drafts", { method: "POST", authorization: "Bearer ok", body: { actionId: "create", payload }, workspaceRepository, blogDraftRepository: repository }); const id = (created.payload.data as { settlement: { result: { id: string } } }).settlement.result.id;
  const updated = await request(`/api/v1/workspaces/averon/blog-drafts/${id}`, { method: "PATCH", authorization: "Bearer ok", body: { actionId: "update", patch: { title: "Updated title" } }, workspaceRepository, blogDraftRepository: repository });
  assert.equal(updated.status, 200); const draft = (updated.payload.data as { settlement: { result: { title: string; published: boolean } } }).settlement.result; assert.equal(draft.title, "Updated title"); assert.equal(draft.published, false);
});

test("write permission, workspace isolation, and revoked access are enforced", async () => {
  for (const repository of [workspaces("member"), workspaces("owner", "disabled")]) { const response = await request("/api/v1/workspaces/averon/blog-drafts", { method: "POST", authorization: "Bearer ok", body: { actionId: "denied", payload }, workspaceRepository: repository }); assert.equal(response.status, 403); }
  const cross = await request("/api/v1/workspaces/other/blog-drafts", { method: "POST", authorization: "Bearer ok", body: { actionId: "cross", payload }, workspaceRepository: workspaces() }); assert.equal(cross.status, 403); assert.equal(cross.payload.error.code, "WORKSPACE_ACCESS_DENIED");
});

test("unsupported publish and arbitrary payload fields are rejected before persistence", async () => {
  const repository = new MemoryBlogDraftRepository(); const workspaceRepository = workspaces();
  const publish = await request("/api/v1/workspaces/averon/blog-drafts/draft-1/publish", { method: "POST", authorization: "Bearer ok", body: {}, workspaceRepository, blogDraftRepository: repository }); assert.equal(publish.status, 400); assert.equal(publish.payload.error.code, "ACTION_UNSUPPORTED");
  const extra = await request("/api/v1/workspaces/averon/blog-drafts", { method: "POST", authorization: "Bearer ok", body: { actionId: "bad", payload: { ...payload, published: true } }, workspaceRepository, blogDraftRepository: repository }); assert.equal(extra.status, 400); assert.equal(extra.payload.error.code, "ACTION_VALIDATION_FAILED"); assert.equal(repository.writes, 0);
});

test("read-back mismatch fails verification and diagnostics never contain the blog body", async () => {
  const repository = new MemoryBlogDraftRepository(); repository.corruptReadBack = true; const diagnostics = new ActionDiagnosticsStore();
  const response = await request("/api/v1/workspaces/averon/blog-drafts", { method: "POST", authorization: "Bearer ok", body: { actionId: "mismatch", payload }, workspaceRepository: workspaces(), blogDraftRepository: repository, actionDiagnostics: diagnostics });
  assert.equal(response.status, 500); assert.equal(response.payload.error.code, "ACTION_VERIFICATION_FAILED"); const serialized = JSON.stringify(diagnostics.list()); assert.equal(serialized.includes(payload.body), false); assert.equal(diagnostics.list().at(-1)?.event, "action.verification_failed");
});
