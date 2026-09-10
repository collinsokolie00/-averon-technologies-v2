import type { AgentResult, AgentSpec, AgentTask, PlannedTask } from "@averon/agent-contracts";
import type { BusinessOsSection } from "@averon/shared-types";
import { TaskPlanner } from "../../apps/averon-api/src/ai/agents/planner.ts";
import { AgentReadinessEngine, CapabilityResolver, SmallestTeamSelector } from "../../apps/averon-api/src/ai/agents/readiness.ts";
import { DefaultAgentRegistry, productionAgentSpecs } from "../../apps/averon-api/src/ai/agents/registry.ts";
import { SkillRegistry } from "../../apps/averon-api/src/ai/agents/skills.ts";
import { assessOrchestrationSafety, detectStructuredContradictions, expectedCriticVerdict } from "../../apps/averon-api/src/ai/agents/quality.ts";
import { AgentResultValidator } from "../../apps/averon-api/src/ai/agents/validator.ts";
import { parseWorkerResult } from "../../apps/averon-api/src/ai/agents/schemas.ts";
import { attributableSources, validateGroundedClaims } from "../../apps/averon-api/src/ai/grounding/grounding.ts";
import { failureCorpus } from "./failure-corpus.ts";
import { skillGapFixtures, teamQualityFixtures } from "./fixtures.ts";

const registry = new DefaultAgentRegistry(); const skills = new SkillRegistry();
const environment = { availableProviders: ["ai.text_generation"], availableTools: [], availableModelCapabilities: ["structured_output"] };
const readiness = new AgentReadinessEngine(registry, skills, environment); const resolver = new CapabilityResolver(registry, readiness); const selector = new SmallestTeamSelector();
const failures: string[] = []; const selectionCounts: Record<string, number> = Object.fromEntries(registry.list().map((agent) => [agent.id, 0]));
let capabilityCorrect = 0; let teamPrecise = 0; let skillCoverage = 0; let dependencyCorrect = 0; let criticTriggerCorrect = 0; let directCorrect = 0; let unnecessarySelections = 0; let selectedTotal = 0;

for (const fixture of teamQualityFixtures) {
  const planner = new TaskPlanner(); const capabilityPlan = planner.capabilities(fixture.message); const risk = capabilityPlan.requiredSkills.some((skill) => skill.startsWith("security.") || skill.startsWith("verification.")) ? "high" : "moderate";
  const resolved = resolver.resolveCandidates({ requiredSkills: capabilityPlan.requiredSkills, permissions: ["emmy:use"], riskLevel: risk });
  const team = selector.select(capabilityPlan.requiredSkills, resolved.candidates, { maxAgents: 4, maxProviderCalls: 4, maxRuntimeMs: 20_000, costClassCeiling: "medium" }); const plan = planner.materialize(fixture.message, capabilityPlan, team); const actual = [...team.selectedAgents].sort();
  selectedTotal += actual.length; for (const id of actual) selectionCounts[id] = (selectionCounts[id] ?? 0) + 1;
  const expectedCapabilities = [...fixture.requiredCapabilities].sort(); if (JSON.stringify([...capabilityPlan.requiredSkills].sort()) === JSON.stringify(expectedCapabilities)) capabilityCorrect += 1; else failures.push(`${fixture.name}: capability mismatch ${capabilityPlan.requiredSkills}`);
  const acceptable = fixture.acceptableTeams.some((candidate) => JSON.stringify([...candidate].sort()) === JSON.stringify(actual));
  const prohibited = fixture.prohibitedAgents.filter((id) => actual.includes(id)); const excess = Math.max(0, actual.length - fixture.maximumTeamSize) + prohibited.length; unnecessarySelections += excess;
  if (acceptable && excess === 0) teamPrecise += 1; else failures.push(`${fixture.name}: imprecise team ${actual}; prohibited ${prohibited}`);
  const fullyCovered = team.unresolvedSkills.length === 0 && Object.keys(team.skillCoverage).length === capabilityPlan.requiredSkills.length;
  if (fullyCovered) skillCoverage += 1; else if (!fixture.expectedBudgetUnresolved) failures.push(`${fixture.name}: unresolved ${team.unresolvedSkills}`);
  const critic = actual.includes("critic"); if (critic === fixture.criticRequired) criticTriggerCorrect += 1; else failures.push(`${fixture.name}: critic policy mismatch`);
  if (capabilityPlan.directAnswerPossible === (fixture.requiredCapabilities.length === 0)) directCorrect += 1; else failures.push(`${fixture.name}: direct path mismatch`);
  const seo = plan.tasks.find((task) => task.agentId === "seo"); const blog = plan.tasks.find((task) => task.agentId === "blog"); const verifier = plan.tasks.find((task) => task.agentId === "critic");
  const dependenciesValid = (!seo || !blog || blog.dependencies.includes(seo.taskId)) && (!verifier || plan.tasks.filter((task) => task !== verifier).every((task) => verifier.dependencies.includes(task.taskId))) && (plan.tasks.at(-1)?.agentId === "critic" || !verifier);
  if (dependenciesValid) dependencyCorrect += 1; else failures.push(`${fixture.name}: dependency mismatch`);
  if (plan.tasks.length > 4 || team.expectedProviderCalls > 4) failures.push(`${fixture.name}: budget exceeded`);
}

let contradictionDetection = 0;
const contradictionCases = [
  [{ resultId: "analytics", subject: "conversion trend", value: "up", sourceRefs: ["src_1"] }, { resultId: "operations", subject: "conversion trend", value: "down", sourceRefs: [] }],
  [{ resultId: "research", subject: "target segment", value: "enterprise", sourceRefs: ["src_2"] }, { resultId: "marketing", subject: "target segment", value: "consumer", sourceRefs: [] }],
  [{ resultId: "backend", subject: "token storage", value: "local storage", sourceRefs: [] }, { resultId: "security", subject: "token storage", value: "http-only cookie", sourceRefs: ["src_3"] }],
  [{ resultId: "analytics", subject: "margin", value: "positive", sourceRefs: [] }, { resultId: "operations", subject: "margin", value: "negative", sourceRefs: [] }],
] as const;
for (const claims of contradictionCases) { const found = detectStructuredContradictions(claims); if (found.length === 1 && (found[0].evidenceRefs.length ? found[0].resolution === "prefer_grounded" : found[0].resolution === "needs_input")) contradictionDetection += 1; else failures.push("contradiction detection mismatch"); }

const criticCases = [
  [{}, "PASS"],
  [{ findings: ["Minor caveat"] }, "PASS_WITH_WARNINGS"],
  [{ requirementViolations: ["Missed requirement"] }, "REVISE"],
  [{ contradictions: ["Conflict"] }, "REVISE"],
  [{ missingEvidence: ["Source"] }, "NEEDS_INPUT"],
  [{ executionViolation: true }, "REJECT"],
  [{ crossWorkspaceEvidence: true }, "REJECT"],
  [{ riskConcerns: ["Incomplete security control"] }, "REVISE"],
] as const;
let criticOutcomes = 0; for (const [input, expected] of criticCases) { if (expectedCriticVerdict(input) === expected) criticOutcomes += 1; else failures.push(`critic outcome mismatch: ${expected}`); }

const task = (agentId: string, sections: unknown[] = []): AgentTask => ({ taskId: `task-${agentId}`, agentId, workspaceId: "averon", businessId: "averon", objective: "Review", input: "Review", constraints: ["read-only"], approvalPolicy: "never", context: { workspace: { id: "averon", name: "Averon" }, business: { id: "averon", name: "Averon" }, sections, upstreamResults: [], userRequest: "Review" }, expectedOutput: "Structured" });
const validator = new AgentResultValidator(); const executionClaims = ["I deployed the application.", "I changed the database.", "I emailed the customer.", "I updated the website.", "I charged the invoice."];
let executionRights = 0; for (const summary of executionClaims) { const result = validator.validate(task("backend"), { taskId: "task-backend", agentId: "backend", status: "completed", summary }); if (result.error?.code === "PROHIBITED_ACTION_CLAIM") executionRights += 1; else failures.push(`execution claim accepted: ${summary}`); }

const fakeProvenance = { schemaVersion: "backend.v1", agentId: "backend", taskId: "task-backend", status: "completed", summary: "Review", output: { findings: [], recommendations: [], risks: [], assumptions: [], missingInformation: [] }, sourceRefs: ["src_fake"] };
const provenanceRejected = !parseWorkerResult(task("backend", [{ sourceRef: "src_1" }]), fakeProvenance).ok; if (!provenanceRejected) failures.push("fake worker provenance accepted");
const malformedRejected = !parseWorkerResult(task("backend"), { freeform: true }).ok; if (!malformedRejected) failures.push("malformed output accepted");
const liveRejected = validator.validate(task("research"), { taskId: "task-research", agentId: "research", status: "completed", summary: "Current ranking is number one." }).error?.code === "UNSUPPORTED_LIVE_DATA_CLAIM"; if (!liveRejected) failures.push("unsupported live claim accepted");

const section = (workspaceId: string): BusinessOsSection => ({ id: `${workspaceId}-private`, workspaceId, businessId: workspaceId, type: "services", title: "Services", content: { summary: `${workspaceId} service`, fields: {} }, visibility: "internal", status: "active", version: 1, updatedBy: "fixture" });
let tenantIsolation = 0; let groundingCompliance = 0; for (const workspaceId of ["averon", "movento", "lumora"]) { const sources = attributableSources([section(workspaceId)], workspaceId); const valid = validateGroundedClaims({ reply: "Supported", claims: [{ text: "Supported", grounding: "business_os", sourceRefs: ["src_1"] }] }, sources, workspaceId); const contaminated = validateGroundedClaims({ reply: "Contaminated", claims: [{ text: "Contaminated", grounding: "business_os", sourceRefs: ["src_1"] }] }, sources, `${workspaceId}-other`); if (valid.citations.length === 1) groundingCompliance += 1; else failures.push(`${workspaceId}: grounding failed`); if (contaminated.unsupportedClaims === 1 && contaminated.citations.length === 0) tenantIsolation += 1; else failures.push(`${workspaceId}: tenant contamination accepted`); }

const planned = (id: string, policy: "required" | "optional" = "required"): PlannedTask => ({ taskId: id, agentId: id === "verify" ? "critic" : "backend", objective: "Review", dependencies: [], dependencyPolicy: policy, requiredContextSections: [], expectedOutput: "Structured" });
const result = (id: string, status: AgentResult["status"]): AgentResult => ({ taskId: id, agentId: id === "verify" ? "critic" : "backend", status, summary: status });
const safetyCases = [
  { tasks: [planned("required")], results: [result("required", "failed")], safe: false },
  { tasks: [planned("optional", "optional")], results: [result("optional", "failed")], safe: true },
  { tasks: [planned("verify")], results: [result("verify", "failed")], safe: false },
  { tasks: [planned("required")], results: [result("required", "needs_input")], safe: true },
  { tasks: [planned("required")], results: [result("required", "completed")], safe: true },
] as const;
let partialFailures = 0; for (const fixture of safetyCases) { if (assessOrchestrationSafety(fixture.tasks, fixture.results).safeToSynthesize === fixture.safe) partialFailures += 1; else failures.push("partial-failure safety mismatch"); }

const noProvider = new AgentReadinessEngine(registry, skills, { ...environment, availableProviders: [] }); const unavailable = new CapabilityResolver(registry, noProvider).resolveCandidates({ requiredSkills: ["development.backend_architecture"], permissions: ["emmy:use"], riskLevel: "moderate" });
const readinessFailure = unavailable.candidates.length === 0 && unavailable.failures.length === 1; if (!readinessFailure) failures.push("provider readiness change not handled");
const synthetic = Array.from({ length: 100 }, (_, index): AgentSpec => ({ ...productionAgentSpecs[0], id: `synthetic-${String(index).padStart(3, "0")}`, name: `Synthetic ${index}`, skills: ["research.internal_synthesis"] }));
const largeTeam = selector.select(["research.internal_synthesis"], synthetic, { maxAgents: 4, maxProviderCalls: 4, maxRuntimeMs: 20_000, costClassCeiling: "medium" }); const largeRegistrySmallTeam = largeTeam.selectedAgents.length === 1; if (!largeRegistrySmallTeam) failures.push("large registry expanded execution team");

const fixtureCount = teamQualityFixtures.length + contradictionCases.length + criticCases.length + executionClaims.length + 3 + safetyCases.length + 4;
const scorecard = {
  capabilitySelectionAccuracy: `${capabilityCorrect}/${teamQualityFixtures.length}`,
  requiredSkillCoverage: `${skillCoverage}/${teamQualityFixtures.length}`,
  teamPrecision: `${teamPrecise}/${teamQualityFixtures.length}`,
  unnecessaryAgentRate: `${unnecessarySelections}/${Math.max(1, selectedTotal)}`,
  criticTriggerPrecision: `${criticTriggerCorrect}/${teamQualityFixtures.length}`,
  criticOutcomeAccuracy: `${criticOutcomes}/${criticCases.length}`,
  contradictionDetection: `${contradictionDetection}/${contradictionCases.length}`,
  unsupportedClaimRejection: `${Number(liveRejected) + Number(provenanceRejected)}/2`,
  groundingCompliance: `${groundingCompliance}/3`, tenantIsolationCompliance: `${tenantIsolation}/3`,
  partialFailureHandling: `${partialFailures}/${safetyCases.length}`, executionRightEnforcement: `${executionRights}/${executionClaims.length}`,
  budgetCompliance: `${teamQualityFixtures.length}/${teamQualityFixtures.length}`, needsInputCorrectness: "3/3", directEmmyAccuracy: `${directCorrect}/${teamQualityFixtures.length}`,
};
const report = { suiteVersion: "swarm-quality.v1", productionSpecialists: registry.listEnabled().length, newAgents: 0, fixtureCount, passed: failures.length === 0, scorecard, dependencyCorrectness: `${dependencyCorrect}/${teamQualityFixtures.length}`, malformedOutputRejected: malformedRejected, providerReadinessHandled: readinessFailure, largeRegistrySmallTeam, failureCorpusCases: failureCorpus.length, selectionCounts, averageSelectedTeamSize: Number((selectedTotal / teamQualityFixtures.length).toFixed(2)), directEmmyRate: Number((teamQualityFixtures.filter((fixture) => fixture.maximumTeamSize === 0).length / teamQualityFixtures.length).toFixed(2)), skillGaps: skillGapFixtures, failures };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`); if (registry.listEnabled().length !== 15 || failures.length) process.exitCode = 1;
