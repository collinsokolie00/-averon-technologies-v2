import assert from "node:assert/strict";
import test from "node:test";
import type { WorkspacePermissionProjection } from "@averon/shared-types";
import { productionAgentSpecs } from "../src/ai/agents/registry.ts";
import { productionSkills } from "../src/ai/agents/skills.ts";
import { registeredActionPolicies } from "../src/ai/actions/action-capabilities.ts";
import { MemoryWorkspaceRepository, request } from "./http-harness.ts";

const businesses = [{ id: "averon", name: "Averon Technologies", slug: "averon", status: "active" as const }, { id: "lumora", name: "Lumora", slug: "lumora", status: "active" as const }];
const workspaces = businesses.map((item) => ({ id: item.id, businessId: item.id, name: item.name, slug: item.slug, status: "active" as const }));
const repository = (role: "owner" | "viewer" = "owner") => new MemoryWorkspaceRepository({ businesses, workspaces, memberships: [{ id: "averon__user-1", userId: "user-1", workspaceId: "averon", businessId: "averon", role, status: "active" }] });

test("permission projection reuses authoritative registries and current workspace authority", async () => {
  let providerCalls = 0; const result = await request("/api/v1/workspaces/averon/permissions", { authorization: "Bearer valid", workspaceRepository: repository(), aiProvider: { async generate() { providerCalls += 1; return { text: "unused" }; } } });
  assert.equal(result.status, 200); const data = result.payload.data as unknown as WorkspacePermissionProjection;
  assert.equal(data.agents.length, 16); assert.deepEqual(data.agents.map((item) => item.id), productionAgentSpecs.map((item) => item.id));
  assert.deepEqual(data.agents.flatMap((item) => item.skills.map((skill) => skill.id)).sort(), productionSkills.map((item) => item.id).sort());
  assert.deepEqual(data.actions.map((item) => item.id), registeredActionPolicies.map((item) => item.actionType));
  assert.equal(data.actions.find((item) => item.id === "frontend.source.apply")?.state, "requires_approval");
  assert.equal(data.actions.find((item) => item.id === "seo.metadata.update")?.state, "automatic");
  assert.equal(data.boundaries.find((item) => item.id === "deploy.production")?.reasonCode, "CAPABILITY_NOT_REGISTERED");
  assert.equal(data.agents.every((item) => item.specialistAuthority.find((entry) => entry.label === "Direct mutation")?.state === "blocked"), true);
  assert.equal(providerCalls, 0); assert.equal(JSON.stringify(data).match(/prompt|reasoning|credentials|source contents|payload/gi), null);
});

test("effective permissions block unauthorized actions and cross-workspace access", async () => {
  const viewer = await request("/api/v1/workspaces/averon/permissions", { authorization: "Bearer valid", workspaceRepository: repository("viewer") });
  assert.equal(viewer.status, 200); const data = viewer.payload.data as unknown as WorkspacePermissionProjection;
  assert.equal(data.actions.find((item) => item.id === "seo.metadata.update")?.state, "blocked");
  assert.equal(data.actions.find((item) => item.id === "seo.metadata.update")?.reasonCode, "WORKSPACE_PERMISSION_MISSING");
  assert.equal(data.agents.every((item) => item.specialistAuthority.find((entry) => entry.label === "read")?.state === "blocked"), true);
  const denied = await request("/api/v1/workspaces/lumora/permissions", { authorization: "Bearer valid", workspaceRepository: repository() });
  assert.equal(denied.status, 403); assert.equal(denied.payload.error.code, "WORKSPACE_ACCESS_DENIED");
});
