import assert from "node:assert/strict";
import test from "node:test";
import type { AiDiagnostic } from "@averon/shared-types";
import { AiDiagnosticsStore, MemoryDiagnosticsRepository } from "../src/ai/diagnostics/diagnostics.store.ts";
import { MemoryWorkspaceRepository, request } from "./http-harness.ts";

const businesses = [{ id: "averon", name: "Averon Technologies", slug: "averon", status: "active" as const }, { id: "lumora", name: "Lumora", slug: "lumora", status: "active" as const }];
const workspaces = businesses.map((item) => ({ id: item.id, businessId: item.id, name: item.name, slug: item.slug, status: "active" as const }));
const workspaceRepository = () => new MemoryWorkspaceRepository({ businesses, workspaces, memberships: [{ id: "averon__user-1", userId: "user-1", workspaceId: "averon", businessId: "averon", role: "owner", status: "active" }] });
function diagnostic(requestId: string, workspaceId = "averon"): AiDiagnostic { return { requestId, workspaceId, businessId: workspaceId, startedAt: new Date(Date.now() - 1_000).toISOString(), durationMs: 14200, finalStatus: "completed", plan: { taskCount: 1, agentIds: ["seo"] }, tasks: [{ taskId: "task-seo", agentId: "seo", status: "completed", durationMs: 12000, providerCalls: 1, tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 }, validationStatus: "valid" }], citations: [{ sectionType: "brand", label: "Brand", version: 1 }], groundedClaimCount: 1, unsupportedClaimCount: 0, attributionValidation: "valid", requestedSkills: ["seo.metadata"], selectedAgentIds: ["seo"], skillCoverage: { "seo.metadata": "seo" }, criticInvoked: false, errorCodes: [], providerCalls: 1, tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 } }; }
const proposal = { actionId: "proposal-1", actionType: "frontend.source.propose", status: "approval_required", approvalStatus: "pending", verificationStatus: "pending", deploymentStatus: "not_performed", targetFiles: ["src/styles/globals.css"], changedLines: 1, insertions: 1, deletions: 1, warnings: [] } as const;

test("Runs API projects one durable proposal/apply operation with preserved lifecycle", async () => {
  const repository = new MemoryDiagnosticsRepository(); const store = new AiDiagnosticsStore(100, 7, repository); await store.add(diagnostic("proposal-request"));
  await store.recordOperation("proposal-request", proposal); await store.recordOperation("apply-request", { ...proposal, status: "applying", approvalStatus: "approved" }); await store.recordOperation("apply-request", { ...proposal, status: "verifying", approvalStatus: "approved" }); await store.recordOperation("apply-request", { ...proposal, status: "completed", approvalStatus: "approved", verificationStatus: "passed" });
  const list = await request("/api/v1/workspaces/averon/runs", { authorization: "Bearer valid", workspaceRepository: workspaceRepository(), aiDiagnostics: store });
  assert.equal(list.status, 200); const items = list.payload.data.items as Array<{ operationId: string; title: string }>;
  assert.equal(items.length, 1); assert.equal(items[0]?.operationId, "proposal-1"); assert.equal(items[0]?.title, "Frontend Source Proposal");
  const detail = await request("/api/v1/workspaces/averon/runs/proposal-1", { authorization: "Bearer valid", workspaceRepository: workspaceRepository(), aiDiagnostics: store });
  assert.equal(detail.status, 200); assert.deepEqual((detail.payload.data.requestIds as string[]), ["proposal-request", "apply-request"]); assert.deepEqual((detail.payload.data.actionTransitions as Array<{ status: string }>).map((item) => item.status), ["awaiting_approval", "applying", "verifying", "completed"]);
  assert.equal((detail.payload.data.specialistDetails as Array<{ id: string; displayName: string; skills: string[] }>)[0]?.displayName, "Mantis"); assert.deepEqual((detail.payload.data.specialistDetails as Array<{ skills: string[] }>)[0]?.skills, ["seo.metadata"]);
});

test("Runs reads are authenticated, workspace-authorized, scoped and make zero provider calls", async () => {
  const store = new AiDiagnosticsStore(); await store.add(diagnostic("averon-run")); await store.add(diagnostic("lumora-run", "lumora")); let providerCalls = 0;
  const aiProvider = { async generate() { providerCalls += 1; return { text: "should not run" }; } };
  assert.equal((await request("/api/v1/workspaces/averon/runs", { workspaceRepository: workspaceRepository(), aiDiagnostics: store, aiProvider })).status, 401);
  const allowed = await request("/api/v1/workspaces/averon/runs", { authorization: "Bearer valid", workspaceRepository: workspaceRepository(), aiDiagnostics: store, aiProvider }); assert.equal((allowed.payload.data.items as unknown[]).length, 1);
  const denied = await request("/api/v1/workspaces/lumora/runs", { authorization: "Bearer valid", workspaceRepository: workspaceRepository(), aiDiagnostics: store, aiProvider }); assert.equal(denied.status, 403); assert.equal(denied.payload.error.code, "WORKSPACE_ACCESS_DENIED"); assert.equal(providerCalls, 0);
});

test("Runs detail excludes sensitive diagnostics fields and exposes only safe failure codes", async () => {
  const store = new AiDiagnosticsStore(); await store.add({ ...diagnostic("failed"), finalStatus: "failed", errorCodes: ["SOURCE_CONFLICT"], prompt: "private", reply: "private", content: "private", systemPrompt: "private" } as AiDiagnostic);
  const result = await request("/api/v1/workspaces/averon/runs/failed", { authorization: "Bearer valid", workspaceRepository: workspaceRepository(), aiDiagnostics: store }); assert.equal(result.status, 200); assert.deepEqual(result.payload.data.errorCodes, ["SOURCE_CONFLICT"]);
  const serialized = JSON.stringify(result.payload); for (const value of ["prompt", "reply", "content", "systemPrompt", "private", "sourceCode", "credentials"]) assert.equal(serialized.includes(value), false);
});

test("Runs trace exposes only skills recorded by authoritative diagnostics coverage", async () => {
  const store = new AiDiagnosticsStore();
  await store.add({ ...diagnostic("no-skill-evidence"), requestedSkills: [], skillCoverage: {} });
  const result = await request("/api/v1/workspaces/averon/runs/no-skill-evidence", { authorization: "Bearer valid", workspaceRepository: workspaceRepository(), aiDiagnostics: store });
  assert.equal(result.status, 200);
  assert.deepEqual((result.payload.data.specialistDetails as Array<{ skills: string[] }>)[0]?.skills, []);
  assert.equal((result.payload.data.trace as Array<{ kind: string }>).some((stage) => stage.kind === "skill"), false);
});

test("unknown and cross-workspace run details fail closed", async () => { const store = new AiDiagnosticsStore(); await store.add(diagnostic("averon-run")); const missing = await request("/api/v1/workspaces/averon/runs/missing", { authorization: "Bearer valid", workspaceRepository: workspaceRepository(), aiDiagnostics: store }); assert.equal(missing.status, 404); assert.equal(missing.payload.error.code, "RUN_NOT_FOUND"); const denied = await request("/api/v1/workspaces/lumora/runs/averon-run", { authorization: "Bearer valid", workspaceRepository: workspaceRepository(), aiDiagnostics: store }); assert.equal(denied.status, 403); });
