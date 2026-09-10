import test from "node:test";
import assert from "node:assert/strict";
import { MemoryConversationRepository, MemoryWorkspaceRepository, request, StubVerifier, userToken } from "./http-harness.ts";
import type { AiProvider } from "../src/ai/providers/ai-provider.ts";

function workspaces(userId = "user-1") { return new MemoryWorkspaceRepository({ businesses: [{ id: "averon", name: "Averon Technologies", slug: "averon", status: "active" }, { id: "movento", name: "Movento", slug: "movento", status: "active" }], workspaces: [{ id: "averon", businessId: "averon", name: "Averon Technologies", slug: "averon", status: "active" }, { id: "movento", businessId: "movento", name: "Movento", slug: "movento", status: "active" }], memberships: [{ id: `averon__${userId}`, userId, workspaceId: "averon", businessId: "averon", role: "owner", status: "active" }] }); }

test("private conversations require authentication and are scoped to their owner", async () => {
  const repo = new MemoryConversationRepository();
  assert.equal((await request("/api/v1/emmy/conversations", { conversationRepository: repo })).status, 401);
  const created = await request("/api/v1/emmy/conversations", { method: "POST", authorization: "Bearer valid", body: { workspaceId: null }, conversationRepository: repo });
  const id = String(created.payload.data.id); assert.equal(created.status, 201);
  const other = new StubVerifier({ ...userToken, uid: "user-2", sub: "user-2", email: "other@example.com" });
  const denied = await request(`/api/v1/emmy/conversations/${id}/messages`, { authorization: "Bearer valid", verifier: other, conversationRepository: repo });
  assert.equal(denied.status, 404);
});

test("workspace conversations require current workspace membership", async () => {
  const repo = new MemoryConversationRepository(); const workspaceRepository = workspaces();
  const created = await request("/api/v1/emmy/conversations", { method: "POST", authorization: "Bearer valid", body: { workspaceId: "averon" }, conversationRepository: repo, workspaceRepository });
  assert.equal(created.status, 201);
  const crossWorkspace = await request("/api/v1/emmy/conversations", { method: "POST", authorization: "Bearer valid", body: { workspaceId: "movento" }, conversationRepository: repo, workspaceRepository });
  assert.equal(crossWorkspace.status, 403);
  workspaceRepository.memberships.clear();
  assert.equal((await request(`/api/v1/emmy/conversations/${String(created.payload.data.id)}/messages`, { authorization: "Bearer valid", conversationRepository: repo, workspaceRepository })).status, 403);
});

test("general conversations persist messages without workspace access", async () => {
  const repo = new MemoryConversationRepository();
  const created = await request("/api/v1/emmy/conversations", { method: "POST", authorization: "Bearer valid", body: { workspaceId: null }, conversationRepository: repo }); const id = String(created.payload.data.id);
  const sent = await request(`/api/v1/emmy/conversations/${id}/messages`, { method: "POST", authorization: "Bearer valid", body: { message: "Help with Averon services" }, conversationRepository: repo });
  assert.equal(sent.status, 200);
  const messages = await request(`/api/v1/emmy/conversations/${id}/messages`, { authorization: "Bearer valid", conversationRepository: repo });
  assert.equal((messages.payload.data.items as unknown[]).length, 2);
  assert.equal((await repo.get(id))?.title, "Help with Averon services");
});

test("conversation truthfulness guard rejects unsupported operational success language", async () => {
  const repo = new MemoryConversationRepository(); const conversation = await repo.create("user-1", null);
  const provider: AiProvider = { async generate() { return { text: "Applied successfully." }; } };
  const result = await request(`/api/v1/emmy/conversations/${conversation.id}/messages`, { method: "POST", authorization: "Bearer valid", body: { message: "Did you make that source change?" }, conversationRepository: repo, aiProvider: provider });
  assert.equal(result.status, 200);
  assert.match(String(result.payload.data.reply), /do not have an authoritative completed action record/i);
  assert.doesNotMatch(String(result.payload.data.reply), /^Applied successfully/i);
});

test("public Emmy route cannot read private conversation history", async () => {
  const repo = new MemoryConversationRepository(); const conversation = await repo.create("user-1", null); await repo.appendMessage(conversation.id, { role: "user", content: "private history" });
  const publicResult = await request("/api/v1/emmy/messages", { method: "POST", body: { message: "What did I say before?" }, conversationRepository: repo });
  assert.equal(publicResult.status, 200);
  assert.equal((publicResult.payload.data as { reply?: string }).reply, "Test Emmy response");
});

test("owner can delete an owned general conversation and all associated messages", async () => {
  const repo = new MemoryConversationRepository(); const item = await repo.create("user-1", null); await repo.appendMessage(item.id, { role: "user", content: "private" });
  const result = await request(`/api/v1/emmy/conversations/${item.id}`, { method: "DELETE", authorization: "Bearer valid", conversationRepository: repo });
  assert.equal(result.status, 200); assert.equal(await repo.get(item.id), null); assert.deepEqual(await repo.listMessages(item.id), []);
});

test("workspace conversation deletion requires ownership and current workspace access", async () => {
  const repo = new MemoryConversationRepository(); const workspaceRepository = workspaces(); const own = await repo.create("user-1", "averon"); await repo.appendMessage(own.id, { role: "assistant", content: "answer" });
  const other = new StubVerifier({ ...userToken, uid: "user-2", sub: "user-2", email: "other@example.com" });
  assert.equal((await request(`/api/v1/emmy/conversations/${own.id}`, { method: "DELETE", authorization: "Bearer valid", verifier: other, conversationRepository: repo, workspaceRepository })).status, 404);
  workspaceRepository.memberships.clear(); assert.equal((await request(`/api/v1/emmy/conversations/${own.id}`, { method: "DELETE", authorization: "Bearer valid", conversationRepository: repo, workspaceRepository })).status, 403); assert.ok(await repo.get(own.id));
  workspaceRepository.memberships.set("averon__user-1", { id: "averon__user-1", userId: "user-1", workspaceId: "averon", businessId: "averon", role: "owner", status: "active" });
  assert.equal((await request(`/api/v1/emmy/conversations/${own.id}`, { method: "DELETE", authorization: "Bearer valid", conversationRepository: repo, workspaceRepository })).status, 200); assert.equal(await repo.get(own.id), null);
});

test("deleting a nonexistent conversation returns a safe not-found response", async () => {
  const result = await request("/api/v1/emmy/conversations/missing", { method: "DELETE", authorization: "Bearer valid", conversationRepository: new MemoryConversationRepository() });
  assert.equal(result.status, 404); assert.equal(result.payload.error.code, "CONVERSATION_NOT_FOUND");
});

test("workspace conversation collections are server-scoped", async () => {
  const repo = new MemoryConversationRepository(); const workspaceRepository = workspaces(); const averon = await repo.create("user-1", "averon"); await repo.create("user-1", null);
  const scoped = await request("/api/v1/workspaces/averon/emmy/conversations", { authorization: "Bearer valid", conversationRepository: repo, workspaceRepository });
  assert.equal(scoped.status, 200); assert.deepEqual((scoped.payload.data.items as Array<{ id: string }>).map((item) => item.id), [averon.id]);
  const general = await request("/api/v1/emmy/conversations/general", { authorization: "Bearer valid", conversationRepository: repo, workspaceRepository });
  assert.equal((general.payload.data.items as Array<{ workspaceId: string | null }>).every((item) => item.workspaceId === null), true);
});

test("action follow-up uses persisted authoritative state without a provider call", async () => {
  const repo = new MemoryConversationRepository(); const workspaceRepository = workspaces(); const conversation = await repo.create("user-1", "averon");
  await repo.appendMessage(conversation.id, { role: "assistant", content: "Proposal prepared", generationStatus: "completed", action: { actionId: "proposal:backend.source.propose", actionType: "backend.source.propose", status: "approval_required", approvalStatus: "pending", verificationStatus: "pending", targetFiles: ["apps/averon-api/src/app.ts"], symbols: ["GET /health"], risk: "low", changedLines: 2, warnings: [] } });
  const provider: AiProvider = { async generate() { throw new Error("provider must not be called"); } };
  const result = await request(`/api/v1/emmy/conversations/${conversation.id}/messages`, { method: "POST", authorization: "Bearer valid", body: { message: "Did you actually apply that?" }, conversationRepository: repo, workspaceRepository, aiProvider: provider });
  assert.equal(result.status, 200); assert.match(String(result.payload.data.reply), /has not been applied/i); assert.match(String(result.payload.data.reply), /Deployment: Not performed/);
  const persisted = await repo.listMessages(conversation.id); assert.equal(persisted.at(-1)?.action?.actionId, "proposal:backend.source.propose");
});

test("operational follow-ups distinguish verified, rolled-back, and no-op durable states", async () => {
  const workspaceRepository = workspaces();
  const provider: AiProvider = { async generate() { throw new Error("provider must not be called"); } };
  const cases = [
    { expected: /completed and verification passed/i, action: { actionId: "verified:backend.source.propose", actionType: "backend.source.apply" as const, status: "completed" as const, approvalStatus: "approved" as const, verificationStatus: "passed" as const, rollbackStatus: "not_required" as const, deploymentStatus: "not_performed" as const, targetFiles: ["apps/averon-api/src/app.ts"], symbols: ["GET /health"], risk: "low" as const, changedLines: 2, warnings: [] } },
    { expected: /rolled back/i, action: { actionId: "rollback:backend.source.propose", actionType: "backend.source.apply" as const, status: "failed" as const, approvalStatus: "approved" as const, verificationStatus: "failed" as const, rollbackStatus: "completed" as const, deploymentStatus: "not_performed" as const, targetFiles: ["apps/averon-api/src/app.ts"], symbols: ["GET /health"], risk: "low" as const, changedLines: 2, warnings: [] } },
    { expected: /no change was required/i, action: { actionId: "noop:backend.source.propose", actionType: "backend.source.propose" as const, status: "completed" as const, approvalStatus: "approved" as const, verificationStatus: "passed" as const, rollbackStatus: "not_required" as const, deploymentStatus: "not_performed" as const, targetFiles: ["apps/averon-api/src/app.ts"], symbols: ["GET /health"], risk: "low" as const, changedLines: 0, warnings: ["SOURCE_ALREADY_SATISFIED"] } },
  ];
  for (const item of cases) {
    const repo = new MemoryConversationRepository(); const conversation = await repo.create("user-1", "averon");
    await repo.appendMessage(conversation.id, { role: "assistant", content: "Prior operation", generationStatus: "completed", action: item.action });
    const result = await request(`/api/v1/emmy/conversations/${conversation.id}/messages`, { method: "POST", authorization: "Bearer valid", body: { message: "Did you actually do this and did you deploy it?" }, conversationRepository: repo, workspaceRepository, aiProvider: provider });
    assert.equal(result.status, 200); assert.match(String(result.payload.data.reply), item.expected); assert.match(String(result.payload.data.reply), /Deployment: Not performed/);
  }
});

test("operational memory resolves the latest authorized workspace action across chats without cross-workspace leakage", async () => {
  const repo = new MemoryConversationRepository(); const workspaceRepository = workspaces(); const current = await repo.create("user-1", "averon"); const priorAveron = await repo.create("user-1", "averon"); const unrelated = await repo.create("user-1", "movento");
  const action = { actionId: "averon-action:backend.source.propose", actionType: "backend.source.apply" as const, status: "completed" as const, approvalStatus: "approved" as const, verificationStatus: "passed" as const, rollbackStatus: "not_required" as const, deploymentStatus: "not_performed" as const, targetFiles: ["apps/averon-api/src/app.ts"], symbols: ["GET /health"], risk: "low" as const, changedLines: 2, warnings: [] };
  await repo.appendMessage(priorAveron.id, { role: "assistant", content: "Verified", generationStatus: "completed", action });
  await repo.appendMessage(unrelated.id, { role: "assistant", content: "Foreign", generationStatus: "completed", action: { ...action, actionId: "movento-action:backend.source.propose", status: "failed", verificationStatus: "failed" } });
  const provider: AiProvider = { async generate() { throw new Error("provider must not be called"); } };
  const result = await request(`/api/v1/emmy/conversations/${current.id}/messages`, { method: "POST", authorization: "Bearer valid", body: { message: "What was the last backend change in this workspace, and was it deployed?" }, conversationRepository: repo, workspaceRepository, aiProvider: provider });
  assert.equal(result.status, 200); assert.match(String(result.payload.data.reply), /averon-action/); assert.doesNotMatch(String(result.payload.data.reply), /movento-action/); assert.match(String(result.payload.data.reply), /Deployment: Not performed/);
});
