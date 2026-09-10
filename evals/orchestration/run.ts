import { TaskPlanner } from "../../apps/averon-api/src/ai/agents/planner.ts";
import { DefaultAgentRegistry } from "../../apps/averon-api/src/ai/agents/registry.ts";
import { SkillRegistry } from "../../apps/averon-api/src/ai/agents/skills.ts";
import { AgentReadinessEngine, CapabilityResolver, SmallestTeamSelector } from "../../apps/averon-api/src/ai/agents/readiness.ts";
import { orchestrationFixtures } from "./fixtures.ts";

let passed = 0; const failures: string[] = []; const metrics = { planValidity: 0, skillCoverage: 0, smallestTeam: 0, readinessFiltering: 0, directAnswer: 0, tenantIsolation: 0, visibilityCompliance: 0, prohibitedAgentCount: 0 }; const registry = new DefaultAgentRegistry(); const readiness = new AgentReadinessEngine(registry, new SkillRegistry(), { availableProviders: ["ai.text_generation"], availableTools: [], availableModelCapabilities: ["structured_output"] }); const resolver = new CapabilityResolver(registry, readiness); const selector = new SmallestTeamSelector();
for (const fixture of orchestrationFixtures) {
  const planner = new TaskPlanner(); const capabilityPlan = planner.capabilities(fixture.userRequest); const permissions = fixture.workspaceRole === "viewer" ? ["content:read"] : ["emmy:use", "content:read"]; const resolved = resolver.resolveCandidates({ requiredSkills: capabilityPlan.requiredSkills, optionalSkills: capabilityPlan.optionalSkills, permissions, riskLevel: "moderate" }); const team = selector.select(capabilityPlan.requiredSkills, resolved.candidates, { maxAgents: 4, maxProviderCalls: 4, maxRuntimeMs: 20_000, costClassCeiling: "medium" }); const plan = planner.materialize(fixture.userRequest, capabilityPlan, team);
  const agents = plan.tasks.map((item) => item.agentId); const errors: string[] = [];
  if (JSON.stringify(agents) !== JSON.stringify(fixture.expectedAgents)) errors.push(`agents ${JSON.stringify(agents)} != ${JSON.stringify(fixture.expectedAgents)}`);
  for (const forbidden of fixture.prohibitedAgents) if (agents.includes(forbidden)) { errors.push(`prohibited agent ${forbidden}`); metrics.prohibitedAgentCount += 1; }
  for (const [dependency, dependent] of fixture.expectedDependencies) { const before = plan.tasks.find((item) => item.agentId === dependency); const after = plan.tasks.find((item) => item.agentId === dependent); if (!before || !after?.dependencies.includes(before.taskId)) errors.push(`missing dependency ${dependency}->${dependent}`); }
  if (plan.tasks.length > 4 || plan.tasks.some((item) => !registry.get(item.agentId)?.enabled)) errors.push("invalid plan bounds/registry"); else metrics.planValidity += 1;
  if (team.unresolvedSkills.length === 0 || fixture.workspaceRole === "viewer") metrics.skillCoverage += 1; else errors.push("unresolved required skill");
  if (team.selectedAgents.length === fixture.expectedAgents.length) metrics.smallestTeam += 1; else errors.push("unnecessary team expansion");
  if (resolved.candidates.every((agent) => readiness.evaluate(agent).status === "READY")) metrics.readinessFiltering += 1; else errors.push("not-ready candidate");
  if (capabilityPlan.directAnswerPossible === (fixture.expectedAgents.length === 0)) metrics.directAnswer += 1; else errors.push("direct-answer mismatch");
  const visible = fixture.workspaceRole === "viewer" ? fixture.businessOsFixture.filter((item) => item.workspaceId === fixture.workspaceId && item.visibility === "public") : fixture.businessOsFixture.filter((item) => item.workspaceId === fixture.workspaceId && item.visibility !== "restricted" || item.workspaceId === fixture.workspaceId && ["owner", "admin"].includes(fixture.workspaceRole));
  if (visible.every((item) => item.workspaceId === fixture.workspaceId)) metrics.tenantIsolation += 1; else errors.push("cross-workspace context");
  const citationTypes = [...new Set(visible.map((item) => item.type))]; if (JSON.stringify(citationTypes) !== JSON.stringify(fixture.expectedCitationTypes)) errors.push(`citations ${JSON.stringify(citationTypes)} != ${JSON.stringify(fixture.expectedCitationTypes)}`); else metrics.visibilityCompliance += 1;
  if (errors.length) failures.push(`${fixture.name}: ${errors.join("; ")}`); else passed += 1;
}
const report = { fixtures: orchestrationFixtures.length, passed, failed: failures.length, metrics, failures };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`); if (failures.length) process.exitCode = 1;
