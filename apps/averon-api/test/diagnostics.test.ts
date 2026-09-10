import assert from "node:assert/strict";
import test from "node:test";
import { AiDiagnosticsStore, diagnosticsRetention, MemoryDiagnosticsRepository, serializeDiagnostic, type DiagnosticsStore } from "../src/ai/diagnostics/diagnostics.store.ts";
import { StubVerifier, request, userToken } from "./http-harness.ts";
import type { AiDiagnostic } from "@averon/shared-types";
import { authoritativeOperationStatus } from "../src/ai/diagnostics/diagnostics.store.ts";
function diagnostic(requestId: string, workspaceId = "averon"): AiDiagnostic { return { requestId, workspaceId, businessId: workspaceId, startedAt: new Date().toISOString(), durationMs: 10, finalStatus: "completed", plan: { taskCount: 1, agentIds: ["seo"] }, tasks: [{ taskId: "task-seo", agentId: "seo", status: "completed", durationMs: 5, providerCalls: 1, tokenUsage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 }, validationStatus: "valid" }], citations: [{ sectionType: "brand", label: "Brand", version: 1 }], errorCodes: [], providerCalls: 2, tokenUsage: { inputTokens: 4, outputTokens: 6, totalTokens: 10 } }; }
const adminVerifier = new StubVerifier({ ...userToken, role: "admin" });
test("diagnostics require platform owner/admin", async () => { const store = new AiDiagnosticsStore(); await store.add(diagnostic("one")); assert.equal((await request("/api/v1/admin/ai/diagnostics", { authorization: "Bearer valid", aiDiagnostics: store })).status, 403); assert.equal((await request("/api/v1/admin/ai/diagnostics", { authorization: "Bearer valid", verifier: adminVerifier, aiDiagnostics: store })).status, 200); });
test("store abstraction is bounded and evicts oldest", async () => { const store: DiagnosticsStore = new AiDiagnosticsStore(2); await store.add(diagnostic("one")); await store.add(diagnostic("two")); await store.add(diagnostic("three")); const result = await request("/api/v1/admin/ai/diagnostics?limit=1", { authorization: "Bearer valid", verifier: adminVerifier, aiDiagnostics: store }); assert.equal((result.payload.data.items as unknown[]).length, 1); assert.equal((result.payload.data.items as Array<{ requestId: string }>)[0].requestId, "three"); });
test("serialization is allowlisted and privacy safe", () => { const unsafe = { ...diagnostic("safe-id"), synthesisAttempts: [{ attempt: 1, validationStatus: "failed", validationIssues: [{ specialist: "emmy", stage: "synthesis", path: "$", code: "SYNTHESIS_OBJECT_REQUIRED", repairable: true }] }], message: "secret", prompt: "secret", reply: "secret", content: "secret", authorization: "secret" } as AiDiagnostic; const serialized = JSON.stringify(serializeDiagnostic(unsafe)); for (const field of ["prompt", "message", "reply", "content", "authorization", "secret"]) assert.doesNotMatch(serialized, new RegExp(`"${field}"`, "i")); assert.match(serialized, /synthesisAttempts/); assert.match(serialized, /SYNTHESIS_OBJECT_REQUIRED/); });
test("serialization retains only privacy-safe canonical request-decision metadata", () => {
  const serialized = serializeDiagnostic({ ...diagnostic("decision"), requestDecision: { kind: "UNSUPPORTED", target: "blog_draft", requestedOutcome: "unknown", mutationIntent: true, prohibitedMutations: [], approvalRequired: false, confidence: "high", reasonCodes: ["ACTION_NOT_SUPPORTED"] } });
  assert.equal(serialized.requestDecision?.kind, "UNSUPPORTED");
  assert.deepEqual(serialized.requestDecision?.reasonCodes, ["ACTION_NOT_SUPPORTED"]);
  assert.equal("message" in (serialized.requestDecision ?? {}), false);
});
test("retention configuration is validated", () => { assert.deepEqual(diagnosticsRetention({ AI_DIAGNOSTICS_MAX_RECORDS: "50", AI_DIAGNOSTICS_RETENTION_DAYS: "14" }), { maximum: 50, days: 14 }); assert.throws(() => diagnosticsRetention({ AI_DIAGNOSTICS_MAX_RECORDS: "0" })); assert.throws(() => diagnosticsRetention({ AI_DIAGNOSTICS_RETENTION_DAYS: "999" })); });
test("unknown diagnostic ID returns a stable 404", async () => { const result = await request("/api/v1/admin/ai/diagnostics/unknown", { authorization: "Bearer valid", verifier: adminVerifier, aiDiagnostics: new AiDiagnosticsStore() }); assert.equal(result.status, 404); assert.equal(result.payload.error.code, "AI_DIAGNOSTIC_NOT_FOUND"); });
test("authoritative operation lifecycle keeps a completed proposal construction awaiting approval", async () => {
  const store = new AiDiagnosticsStore(); await store.add(diagnostic("proposal-request"));
  const proposal = { actionId: "proposal-1", actionType: "frontend.source.propose", status: "approval_required", approvalStatus: "pending", verificationStatus: "pending", deploymentStatus: "not_performed", targetFiles: ["src/styles/globals.css"], changedLines: 1, insertions: 1, deletions: 1, warnings: [] } as const;
  assert.equal(authoritativeOperationStatus(proposal), "awaiting_approval"); await store.recordOperation("proposal-request", proposal); const saved = await store.get("proposal-request"); assert.equal(saved?.finalStatus, "completed"); assert.equal(saved?.operationStatus, "awaiting_approval"); assert.notEqual(saved?.operationStatus, "completed");
  assert.equal(authoritativeOperationStatus({ ...proposal, status: "applying", approvalStatus: "approved" }), "applying"); assert.equal(authoritativeOperationStatus({ ...proposal, status: "verifying", approvalStatus: "approved" }), "verifying"); assert.equal(authoritativeOperationStatus({ ...proposal, status: "completed", approvalStatus: "approved", verificationStatus: "passed" }), "completed"); assert.equal(authoritativeOperationStatus({ ...proposal, status: "rejected", approvalStatus: "rejected", verificationStatus: "failed" }), "rejected"); assert.equal(authoritativeOperationStatus({ ...proposal, status: "failed", verificationStatus: "failed" }), "failed"); assert.equal(authoritativeOperationStatus({ ...proposal, status: "failed", verificationStatus: "failed", rollbackStatus: "completed" }), "rolled_back"); assert.equal(authoritativeOperationStatus({ ...proposal, status: "completed", approvalStatus: "approved", verificationStatus: "passed", warnings: ["SOURCE_ALREADY_SATISFIED"] }), "no_change_required");
});
test("one durable operation record spans proposal and apply requests and survives service reconstruction", async () => {
  const repository = new MemoryDiagnosticsRepository();
  const proposalStore = new AiDiagnosticsStore(100, 7, repository); await proposalStore.add(diagnostic("proposal-request"));
  const proposal = { actionId: "proposal-1", actionType: "frontend.source.propose", status: "approval_required", approvalStatus: "pending", verificationStatus: "pending", deploymentStatus: "not_performed", targetFiles: ["src/styles/globals.css"], changedLines: 1, insertions: 1, deletions: 1, warnings: [] } as const;
  await proposalStore.recordOperation("proposal-request", proposal);
  assert.equal((await proposalStore.list()).length, 1); assert.equal((await proposalStore.get("proposal-request"))?.operationStatus, "awaiting_approval");

  const restartedWhilePending = new AiDiagnosticsStore(100, 7, repository);
  assert.equal((await restartedWhilePending.get("proposal-request"))?.operationStatus, "awaiting_approval");
  const applyStore = new AiDiagnosticsStore(100, 7, repository);
  await applyStore.recordOperation("apply-request", { ...proposal, status: "applying", approvalStatus: "approved" });
  await applyStore.recordOperation("apply-request", { ...proposal, status: "verifying", approvalStatus: "approved" });
  await applyStore.recordOperation("apply-request", { ...proposal, status: "completed", approvalStatus: "approved", verificationStatus: "passed" });

  const restartedAfterCompletion = new AiDiagnosticsStore(100, 7, repository); const items = await restartedAfterCompletion.list();
  assert.equal(items.length, 1); assert.equal(items[0]?.requestId, "proposal-request"); assert.equal(items[0]?.operationId, proposal.actionId); assert.equal(items[0]?.operationStatus, "completed");
  assert.deepEqual(items[0]?.operationRequestIds, ["proposal-request", "apply-request"]);
  assert.deepEqual(items[0]?.operationTransitions?.map((item) => item.status), ["awaiting_approval", "applying", "verifying", "completed"]);
  assert.equal((await restartedAfterCompletion.get("apply-request"))?.operationId, proposal.actionId);
});
test("durable operation upserts are idempotent and workspace isolated", async () => {
  const repository = new MemoryDiagnosticsRepository(); const store = new AiDiagnosticsStore(100, 7, repository);
  await store.add(diagnostic("averon-proposal", "averon")); await store.add(diagnostic("lumora-request", "lumora"));
  const action = { actionId: "averon-action", actionType: "frontend.source.propose", status: "approval_required", approvalStatus: "pending", verificationStatus: "pending", deploymentStatus: "not_performed", targetFiles: ["src/a.css"], changedLines: 1, insertions: 1, deletions: 1, warnings: [] } as const;
  await store.recordOperation("averon-proposal", action); await store.recordOperation("averon-proposal", action);
  assert.equal((await store.list(100, new Set(["averon"]))).length, 1); assert.equal((await store.list(100, new Set(["lumora"]))).length, 1);
  assert.equal((await store.list(100, new Set(["averon"])))[0]?.operationTransitions?.length, 1);
  assert.equal(await store.get("averon-proposal", new Set(["lumora"])), null);
});
