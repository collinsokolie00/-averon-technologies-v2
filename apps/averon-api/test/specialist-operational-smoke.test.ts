import assert from "node:assert/strict";
import test from "node:test";
import type { AiProvider, AiProviderRequest } from "../src/ai/providers/ai-provider.ts";
import { DefaultAgentRegistry } from "../src/ai/agents/registry.ts";
import { MemoryBusinessOsRepository, MemoryWorkspaceRepository, request } from "./http-harness.ts";

const specialists = ["research", "seo", "blog", "analytics", "documentation", "frontend", "backend", "database", "testing", "security", "business-operations", "marketing", "sales", "customer-operations", "critic"] as const;
type SpecialistId = typeof specialists[number];

const prompts: Record<SpecialistId, string> = {
  research: "Research a bounded product question using the supplied internal context.",
  seo: "Analyze sample page SEO metadata and recommend improvements.",
  blog: "Recommend a bounded blog article outline without publishing it.",
  analytics: "Analyze these supplied metrics: 120 visits and 12 conversions versus 100 visits and 10 conversions.",
  documentation: "Draft an internal documentation runbook recommendation.",
  frontend: "Analyze a supplied frontend accessibility issue and recommend a scoped repair.",
  backend: "Analyze a supplied backend API design issue and recommend a scoped repair.",
  database: "Analyze a supplied database schema and query issue without mutation.",
  testing: "Evaluate supplied behavior and propose QA regression test cases.",
  security: "Review a bounded security scenario and identify defensive risk.",
  "business-operations": "Analyze a supplied business operations workflow.",
  marketing: "Produce a bounded marketing campaign positioning recommendation.",
  sales: "Analyze a supplied sales strategy and lead handling scenario.",
  "customer-operations": "Analyze a supplied customer operations support workflow.",
  critic: "Perform independent verification of the supplied plan and identify concrete weaknesses.",
};

const generic = (id: string) => ({ findings: [`finding-${id}`], recommendations: [`recommendation-${id}`], risks: [], assumptions: [], missingInformation: [] });
const outputs: Record<SpecialistId, unknown> = {
  research: { findings: ["finding-research"], knownFacts: ["supplied context"], informationGaps: [], externalResearchRequired: false, recommendations: ["recommendation-research"] },
  seo: { targetIntent: "informational", suggestedKeywords: ["bounded keyword"], titleSuggestions: ["Bounded title"], metaDescriptionSuggestions: ["Bounded description"], contentOutline: ["Outline"], limitations: ["External metrics were not supplied."] },
  blog: { title: "Draft outline", summary: "finding-blog", body: "Unpublished recommendation", suggestedSlug: "draft-outline", callToAction: "Review internally", assumptions: [], missingInformation: [] },
  analytics: { observations: ["finding-analytics"], metricsUsed: ["visits", "conversions"], trends: ["stable conversion rate"], caveats: [], missingData: [], recommendations: ["recommendation-analytics"] },
  documentation: { title: "Runbook draft", purpose: "finding-documentation", sections: [{ heading: "Review", content: "recommendation-documentation" }], actionItems: [], unresolvedItems: [] },
  frontend: generic("frontend"), backend: generic("backend"), database: generic("database"), testing: generic("testing"), security: generic("security"),
  "business-operations": generic("business-operations"), marketing: generic("marketing"), sales: generic("sales"), "customer-operations": generic("customer-operations"),
  critic: { verdict: "PASS_WITH_WARNINGS", findings: ["finding-critic"], contradictions: [], missingEvidence: [], requirementViolations: [], riskConcerns: [], recommendedRevisions: ["recommendation-critic"] },
};

function workspaceRepository() { return new MemoryWorkspaceRepository({ businesses: [{ id: "averon", name: "Averon", slug: "averon", status: "active" }, { id: "other", name: "Other", slug: "other", status: "active" }], workspaces: [{ id: "averon", businessId: "averon", name: "Averon", slug: "averon", status: "active" }, { id: "other", businessId: "other", name: "Other", slug: "other", status: "active" }], memberships: [{ id: "owner", userId: "user-1", workspaceId: "averon", businessId: "averon", role: "owner", status: "active" }] }); }
function businessOsRepository() { const repository = new MemoryBusinessOsRepository(); repository.roots.set("averon", { workspaceId: "averon", businessId: "averon", status: "active", schemaVersion: 1 }); repository.sections.set("averon/profile", { id: "profile", type: "profile", title: "Profile", content: { summary: "Authorized Averon fixture", fields: {} }, visibility: "internal", status: "active", version: 1, workspaceId: "averon", businessId: "averon", updatedBy: "user-1" }); return repository; }

class SmokeProvider implements AiProvider {
  requests: AiProviderRequest[] = [];
  private readonly malformed: boolean;
  constructor(malformed = false) { this.malformed = malformed; }
  async generate(input: AiProviderRequest) {
    this.requests.push(input); const agentId = input.observability?.agentId as SpecialistId | undefined;
    if (agentId) { if (this.malformed) return { text: "{}" }; const taskId = (JSON.parse(input.messages[0]!.content) as { task: { taskId: string } }).task.taskId; return { text: JSON.stringify({ schemaVersion: `${agentId}.v1`, agentId, taskId, status: "completed", summary: `finding-${agentId}`, output: outputs[agentId], warnings: [], missingInformation: [] }) }; }
    const specialistSummaries = this.requests.filter((item) => item.observability?.agentId).map((item) => `finding-${item.observability!.agentId}`).join(", ");
    return { text: JSON.stringify({ reply: this.malformed ? "Specialist output was invalid; no action was taken." : `Emmy synthesis preserved ${specialistSummaries}.`, claims: [] }) };
  }
}

test("all 15 non-Guardian specialists operate through private Emmy with workspace-bound validated advisory output", async () => {
  const registry = new DefaultAgentRegistry();
  for (const specialistId of specialists) {
    const spec = registry.get(specialistId)!; assert.equal(spec.enabled, true); assert.deepEqual(spec.executionRights, ["read", "analyze", "draft", "recommend"]); assert.deepEqual(spec.requiredPermissions, ["emmy:use"]);
    const provider = new SmokeProvider(); const result = await request("/api/v1/workspaces/averon/emmy/messages", { method: "POST", authorization: "Bearer valid", requestId: `smoke-${specialistId}`, body: { message: prompts[specialistId] }, workspaceRepository: workspaceRepository(), businessOsRepository: businessOsRepository(), aiProvider: provider });
    const calls = provider.requests.filter((item) => item.observability?.agentId); const specialistCall = calls.find((item) => item.observability?.agentId === specialistId);
    assert.equal(result.status, 200, specialistId); assert.equal(result.payload.data.finalStatus, "completed", specialistId); assert.ok(specialistCall, specialistId); assert.equal(specialistCall.observability?.workspaceId, "averon", specialistId); assert.equal(specialistCall.observability?.businessId, "averon", specialistId);
    const input = JSON.parse(specialistCall.messages[0]!.content) as { task: { objective: string }; context: { workspace: { id: string }; business: { id: string }; userRequest: string } }; assert.equal(input.task.objective, prompts[specialistId], specialistId); assert.equal(input.context.userRequest, prompts[specialistId], specialistId); assert.equal(input.context.workspace.id, "averon", specialistId); assert.equal(input.context.business.id, "averon", specialistId);
    assert.match(specialistCall.systemPrompt, /read-only recommendation task/i, specialistId); assert.match(specialistCall.systemPrompt, /Do not call tools or other agents/i, specialistId); assert.match(String(result.payload.data.reply), new RegExp(`finding-${specialistId}`), specialistId); assert.equal(result.payload.data.action, undefined, specialistId);
  }
});

test("private Emmy executes bounded multi-specialist teams, remains the sole synthesizer, and fails closed on the five-call product chain", async () => {
  const scenarios = [
    { prompt: "Research supplied evidence for a frontend issue, recommend QA regression test cases, and independently verify the recommendation.", expected: [], limited: true },
    { prompt: "Research supplied evidence for a frontend issue and independently verify the recommendation.", expected: ["research", "frontend", "critic"] },
    { prompt: "Analyze metrics 120 and 100, develop a marketing campaign, assess the sales workflow, and independently verify the recommendation.", expected: [], limited: true },
    { prompt: "Develop a marketing campaign, assess the sales workflow, and independently verify the recommendation.", expected: ["marketing", "sales", "critic"] },
    { prompt: "Analyze a business operations workflow and customer support workflow, draft an internal runbook, and independently verify the recommendation.", expected: [], limited: true },
    { prompt: "Analyze a business operations workflow and customer support workflow, then independently verify the recommendation.", expected: ["business-operations", "customer-operations", "critic"] },
  ];
  for (const scenario of scenarios) { const provider = new SmokeProvider(); const result = await request("/api/v1/workspaces/averon/emmy/messages", { method: "POST", authorization: "Bearer valid", body: { message: scenario.prompt }, workspaceRepository: workspaceRepository(), businessOsRepository: businessOsRepository(), aiProvider: provider }); const calls = provider.requests.filter((item) => item.observability?.agentId); assert.deepEqual(calls.map((item) => item.observability?.agentId).sort(), [...scenario.expected].sort()); if (!scenario.limited) assert.equal(calls.at(-1)?.observability?.agentId, "critic"); assert.equal(provider.requests.at(-1)?.observability?.operation, scenario.limited ? "direct" : "synthesis"); assert.equal(result.payload.data.finalStatus, "completed"); for (const id of scenario.expected) assert.match(String(result.payload.data.reply), new RegExp(`finding-${id}`)); assert.equal(result.payload.data.action, undefined); }
});

test("every specialist malformed-result path fails safely through private Emmy without mutation or authority gain", async () => {
  for (const specialistId of specialists) { const provider = new SmokeProvider(true); const result = await request("/api/v1/workspaces/averon/emmy/messages", { method: "POST", authorization: "Bearer valid", body: { message: prompts[specialistId] }, workspaceRepository: workspaceRepository(), businessOsRepository: businessOsRepository(), aiProvider: provider }); assert.equal(result.status, 200, specialistId); assert.equal(result.payload.data.action, undefined, specialistId); assert.match(String(result.payload.data.reply), /invalid; no action was taken/i, specialistId); const calls = provider.requests.filter((item) => item.observability?.agentId === specialistId); assert.ok(calls.length >= 1 && calls.length <= 2, specialistId); }
  const deniedProvider = new SmokeProvider(); const denied = await request("/api/v1/workspaces/other/emmy/messages", { method: "POST", authorization: "Bearer valid", body: { message: prompts.seo }, workspaceRepository: workspaceRepository(), businessOsRepository: businessOsRepository(), aiProvider: deniedProvider }); assert.equal(denied.status, 403); assert.equal(deniedProvider.requests.length, 0);
});
