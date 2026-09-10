import assert from "node:assert/strict";
import test from "node:test";
import type { AgentContext, AgentId, AgentTask } from "@averon/agent-contracts";
import type { AiProvider, AiProviderRequest } from "../src/ai/providers/ai-provider.ts";
import { DefaultAgentRegistry } from "../src/ai/agents/registry.ts";
import { parseWorkerResult } from "../src/ai/agents/schemas.ts";
import { ProviderSpecialistWorker } from "../src/ai/agents/worker.ts";
import { AgentResultValidator } from "../src/ai/agents/validator.ts";
import { canonicalizeSynthesisEnvelope, validateGroundedClaims } from "../src/ai/grounding/grounding.ts";
import { parseStructuredEnvelope } from "../src/ai/emmy/private-emmy.ts";

const context: AgentContext = { workspace: { id: "workspace", name: "Workspace" }, business: { id: "business", name: "Business" }, sections: [], upstreamResults: [], userRequest: "Local conformance fixture" };
function task(agentId: AgentId): AgentTask { return { taskId: `task-${agentId}`, workspaceId: "workspace", businessId: "business", agentId, taskType: agentId, objective: "Conformance", input: {}, context, constraints: ["read-only"], approvalPolicy: "never", expectedOutput: "Structured output" }; }
function seo(overrides: Record<string, unknown> = {}) { return { schemaVersion: "seo.v1", agentId: "seo", taskId: "task-seo", status: "completed", summary: "Prepared", output: { targetIntent: "informational", suggestedKeywords: ["service"], titleSuggestions: ["Title"], metaDescriptionSuggestions: ["Description"], contentOutline: ["Outline"], limitations: [], ...overrides }, warnings: [], missingInformation: [] }; }
class QueueProvider implements AiProvider {
  requests: AiProviderRequest[] = [];
  private readonly values: string[];

  constructor(values: string[]) { this.values = values; }
  async generate(request: AiProviderRequest) { this.requests.push(request); return { text: this.values.shift() ?? "{}" }; }
}

test("privacy-safe observed specialist corpus canonicalizes harmless shapes and diagnoses harmful ones", () => {
  const cases = [
    { name: "object outline", value: seo({ contentOutline: [{ heading: "Introduction", points: ["Overview"] }] }), ok: true },
    { name: "object keyword", value: seo({ suggestedKeywords: [{ keyword: "service", intent: "informational" }] }), ok: true },
    { name: "extra and reordered fields", value: { extra: "ignored", ...seo() }, ok: true },
    { name: "missing required field", value: seo({ contentOutline: undefined }), ok: false, path: "$.output.contentOutline", repairable: true },
    { name: "wrong task identity", value: { ...seo(), taskId: "wrong" }, ok: false, path: "$.taskId", repairable: false },
  ] as const;
  for (const fixture of cases) { const parsed = parseWorkerResult(task("seo"), fixture.value); assert.equal(parsed.ok, fixture.ok, fixture.name); if (!parsed.ok) { assert.equal(parsed.issues[0].path, fixture.path); assert.equal(parsed.issues[0].repairable, fixture.repairable); } }
});

test("malformed specialist JSON receives exactly one issue-guided repair while identity failures receive none", async () => {
  const repaired = new QueueProvider(["{truncated", JSON.stringify(seo())]); const execution = await new ProviderSpecialistWorker(new DefaultAgentRegistry().get("seo")!, repaired).execute(task("seo"));
  assert.equal(execution.result.status, "completed"); assert.equal(execution.providerCalls, 2); assert.match(repaired.requests[1].messages[0].content, /WORKER_JSON_PARSE_FAILED/);
  const wrongIdentity = new QueueProvider([JSON.stringify({ ...seo(), taskId: "wrong" }), JSON.stringify(seo())]); const rejected = await new ProviderSpecialistWorker(new DefaultAgentRegistry().get("seo")!, wrongIdentity).execute(task("seo"));
  assert.equal(rejected.result.status, "failed"); assert.equal(rejected.providerCalls, 1); assert.equal(rejected.result.validationIssues?.[0].repairable, false);
});

test("semantic safety remains separate: unavailable disclaimer passes and affirmative claims fail with exact paths", () => {
  const validator = new AgentResultValidator(); const seoTask = task("seo");
  const disclaimer = parseWorkerResult(seoTask, seo({ limitations: ["External metrics were not supplied; therefore, no current ranking data, live search volume, current traffic, or current revenue is asserted."] })); assert.equal(disclaimer.ok, true); if (disclaimer.ok) assert.equal(validator.validate(seoTask, disclaimer.result).status, "completed");
  const affirmative = parseWorkerResult(seoTask, seo({ limitations: ["Current ranking is number one."] })); assert.equal(affirmative.ok, true); if (affirmative.ok) { const result = validator.validate(seoTask, affirmative.result); assert.equal(result.error?.code, "UNSUPPORTED_LIVE_DATA_CLAIM"); assert.equal(result.validationIssues?.[0].path, "result.output.limitations[0]"); assert.equal(result.validationIssues?.[0].repairable, false); }
});

test("live-data polarity corpus allows disclaimer variations but blocks affirmative claims everywhere", () => {
  const validator = new AgentResultValidator(); const seoTask = task("seo");
  const disclaimers = [
    "External metrics were not supplied, so current ranking data is unavailable.",
    "We do not have current traffic evidence.",
    "Recommendations are provided without live search volume.",
    "Current revenue is not known from the supplied context.",
    "Validated evidence would be needed to provide current ranking data.",
  ];
  for (const limitation of disclaimers) { const parsed = parseWorkerResult(seoTask, seo({ limitations: [limitation] })); assert.equal(parsed.ok, true); if (parsed.ok) assert.equal(validator.validate(seoTask, parsed.result).status, "completed", limitation); }
  const affirmativeCases = [
    { patch: { limitations: ["Current ranking is number one."] }, path: "result.output.limitations[0]" },
    { summary: "Current traffic increased by 25%.", path: "result.summary" },
    { patch: { contentOutline: ["Live search volume is 10,000 monthly queries."] }, path: "result.output.contentOutline[0]" },
    { patch: { limitations: ["We do not have current ranking data, but current ranking is number one."] }, path: "result.output.limitations[0]" },
  ];
  for (const fixture of affirmativeCases) { const value = { ...seo(fixture.patch ?? {}), ...(fixture.summary ? { summary: fixture.summary } : {}) }; const parsed = parseWorkerResult(seoTask, value); assert.equal(parsed.ok, true); if (parsed.ok) { const result = validator.validate(seoTask, parsed.result); assert.equal(result.error?.code, "UNSUPPORTED_LIVE_DATA_CLAIM"); assert.equal(result.validationIssues?.[0].path, fixture.path); } }
});

test("privacy-safe synthesis corpus surfaces exact structural fields and canonicalizes only harmless differences", () => {
  const fixtures = [
    { value: { reply: "Answer", claims: [] }, valid: true },
    { value: { claims: [], reply: "Answer", extra: "ignored" }, valid: true },
    { value: { reply: "Answer" }, valid: true },
    { value: { reply: "", claims: [] }, valid: false, code: "SYNTHESIS_REPLY_EMPTY", path: "$.reply" },
    { value: { claims: [] }, valid: false, code: "SYNTHESIS_REPLY_REQUIRED", path: "$.reply" },
    { value: { reply: "Answer", claims: {} }, valid: false, code: "SYNTHESIS_CLAIMS_ARRAY_REQUIRED", path: "$.claims" },
    { value: { reply: "Answer", claims: ["bad"] }, valid: false, code: "SYNTHESIS_CLAIM_OBJECT_REQUIRED", path: "$.claims[0]" },
    { value: { reply: "Answer", claims: [{ text: "Claim", grounding: "general", sourceRefs: "src_1" }] }, valid: true },
    { value: { reply: "Answer", claims: [{ text: "", grounding: "general", sourceRefs: [] }] }, valid: false, code: "SYNTHESIS_CLAIM_TEXT_REQUIRED", path: "$.claims[0].text" },
    { value: { reply: "Answer", claims: [{ text: "Claim", grounding: "other", sourceRefs: [] }] }, valid: false, code: "SYNTHESIS_CLAIM_GROUNDING_INVALID", path: "$.claims[0].grounding" },
  ] as const;
  for (const fixture of fixtures) { const result = canonicalizeSynthesisEnvelope(fixture.value); assert.equal(result.structuralValid, fixture.valid); if (!fixture.valid) { assert.equal(result.issues[0].code, fixture.code); assert.equal(result.issues[0].path, fixture.path); assert.equal(result.issues[0].repairable, true); } }
  for (const malformed of ["", "{", '{"reply":"partial"']) { const result = canonicalizeSynthesisEnvelope(parseStructuredEnvelope(malformed)); assert.equal(result.structuralValid, false); assert.equal(result.issues[0].code, "SYNTHESIS_OBJECT_REQUIRED"); }
});

test("external citation corpus retains allowlisted URLs and rejects invented URLs without repair", () => {
  const allowed = "https://example.com/report"; const invented = "https://invented.invalid/report";
  const safe = validateGroundedClaims({ reply: "Supported claim", claims: [{ text: "Supported claim", grounding: "worker_result", sourceRefs: [allowed] }] }, [], "workspace", [allowed]); assert.equal(safe.valid, true); assert.equal(safe.citations[0].url, allowed); assert.equal(safe.validationIssues.length, 0);
  const unsafe = validateGroundedClaims({ reply: "Invented claim", claims: [{ text: "Invented claim", grounding: "worker_result", sourceRefs: [invented] }] }, [], "workspace", [allowed]); assert.equal(unsafe.valid, true); assert.equal(unsafe.claims.length, 0); assert.equal(unsafe.citations.length, 0); assert.deepEqual(unsafe.validationIssues[0], { specialist: "emmy", stage: "synthesis", path: "$.claims[0].sourceRefs", code: "SYNTHESIS_EXTERNAL_SOURCE_UNAUTHORIZED", repairable: false });
});

test("Documentation structural failures expose privacy-safe field-level diagnostics", () => {
  const documentationTask = task("documentation"); const base = { schemaVersion: "documentation.v1", agentId: "documentation", taskId: "task-documentation", status: "completed", summary: "Drafted", output: { title: "SOP", purpose: "Purpose", sections: [{ heading: "Step", content: "Content" }], actionItems: [], unresolvedItems: [] }, warnings: [], missingInformation: [] };
  const fixtures = [
    { output: { ...base.output, title: null }, path: "$.output.title", code: "DOCUMENTATION_TITLE_STRING_REQUIRED" },
    { output: { ...base.output, sections: {} }, path: "$.output.sections", code: "DOCUMENTATION_SECTIONS_ARRAY_REQUIRED" },
    { output: { ...base.output, sections: [{ heading: "Step", content: ["one"] }] }, path: "$.output.sections[0].content", code: "DOCUMENTATION_SECTION_CONTENT_STRING_REQUIRED" },
    { output: { ...base.output, actionItems: ["one", { action: { label: "two" } }] }, path: "$.output.actionItems", code: "DOCUMENTATION_ACTION_ITEMS_STRING_ARRAY_REQUIRED" },
  ];
  for (const fixture of fixtures) { const result = parseWorkerResult(documentationTask, { ...base, output: fixture.output }); assert.equal(result.ok, false); if (!result.ok) assert.deepEqual(result.issues[0], { specialist: "documentation", stage: "schema", path: fixture.path, code: fixture.code, repairable: true }); }
});
