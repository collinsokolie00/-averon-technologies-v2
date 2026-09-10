import assert from "node:assert/strict";
import test from "node:test";
import { productionAgentSpecs } from "../src/ai/agents/registry.ts";
import { SkillRegistry } from "../src/ai/agents/skills.ts";
import { agentDisplayIdentities } from "../src/ai/agents/catalog.ts";
import { MemoryWorkspaceRepository, request } from "./http-harness.ts";

const businesses = [
  { id: "averon", name: "Averon Technologies", slug: "averon", status: "active" as const },
  { id: "lumora", name: "Lumora", slug: "lumora", status: "active" as const },
];
const workspaces = businesses.map((item) => ({ id: item.id, businessId: item.id, name: item.name, slug: item.slug, status: "active" as const }));
const repository = () => new MemoryWorkspaceRepository({ businesses, workspaces, memberships: [{ id: "averon__user-1", userId: "user-1", workspaceId: "averon", businessId: "averon", role: "owner", status: "active" }] });

test("agent catalog projects exactly the authoritative production registry", async () => {
  const result = await request("/api/v1/workspaces/averon/agents", { authorization: "Bearer valid", workspaceRepository: repository() });
  assert.equal(result.status, 200);
  const data = result.payload.data as { workspace: { id: string }; items: Array<Record<string, unknown>>; summary: { specialists: number } };
  assert.equal(data.workspace.id, "averon");
  assert.equal(data.summary.specialists, 16);
  assert.deepEqual(data.items.map((item) => item.id), productionAgentSpecs.map((item) => item.id));
  assert.deepEqual(data.items.map((item) => item.displayName), productionAgentSpecs.map((item) => agentDisplayIdentities[item.id]!.displayName));
});

test("catalog skills, readiness, schemas and certification are authoritative projections", async () => {
  const result = await request("/api/v1/workspaces/averon/agents", { authorization: "Bearer valid", workspaceRepository: repository() });
  const items = (result.payload.data as { items: Array<Record<string, unknown>> }).items;
  const skills = new SkillRegistry();
  for (const spec of productionAgentSpecs) {
    const item = items.find((candidate) => candidate.id === spec.id)!;
    assert.equal(item.version, spec.version);
    assert.equal(item.schemaVersion, spec.outputSchema);
    assert.deepEqual(item.certification, spec.certification);
    assert.deepEqual((item.skills as Array<{ id: string; name: string }>).map(({ id, name }) => ({ id, name })), spec.skills.map((id) => ({ id, name: skills.get(id)!.name })));
    assert.equal(item.readiness, "READY");
  }
});

test("catalog requires authentication and workspace membership without cross-workspace leakage", async () => {
  assert.equal((await request("/api/v1/workspaces/averon/agents", { workspaceRepository: repository() })).status, 401);
  const denied = await request("/api/v1/workspaces/lumora/agents", { authorization: "Bearer valid", workspaceRepository: repository() });
  assert.equal(denied.status, 403);
  assert.equal(denied.payload.error.code, "WORKSPACE_ACCESS_DENIED");
});

test("catalog response excludes prompts, reasoning, credentials and business content", async () => {
  const result = await request("/api/v1/workspaces/averon/agents", { authorization: "Bearer valid", workspaceRepository: repository() });
  const serialized = JSON.stringify(result.payload);
  for (const forbidden of ["systemPrompt", "chainOfThought", "reasoning", "apiKey", "credential", "businessOsContent", "providerCredential"]) assert.equal(serialized.includes(forbidden), false);
});
