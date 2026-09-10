import type { AgentId, AgentResult, AgentTask, OutputValidationIssue } from "@averon/agent-contracts";

export const workerSchemaVersions = { research: "research.v1", seo: "seo.v1", blog: "blog.v1", analytics: "analytics.v1", documentation: "documentation.v1", frontend: "frontend.v1", backend: "backend.v1", database: "database.v1", testing: "testing.v1", security: "security.v1", "business-operations": "business-operations.v1", marketing: "marketing.v1", sales: "sales.v1", "customer-operations": "customer-operations.v1", critic: "critic.v1", guardian: "guardian.v1" } as const;
type EnabledAgentId = keyof typeof workerSchemaVersions;
const isString = (value: unknown): value is string => typeof value === "string";
const strings = (value: unknown) => Array.isArray(value) && value.every(isString);
const optionalStrings = (value: unknown) => value === undefined || strings(value);
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const stringArrayFields: Partial<Record<EnabledAgentId, string[]>> = {
  guardian: ["passed", "failed", "notChecked", "findings", "recommendations"],
  research: ["findings", "knownFacts", "informationGaps", "recommendations"], seo: ["suggestedKeywords", "titleSuggestions", "metaDescriptionSuggestions", "contentOutline", "limitations"], blog: ["assumptions", "missingInformation"], analytics: ["observations", "metricsUsed", "trends", "caveats", "missingData", "recommendations"], documentation: ["actionItems", "unresolvedItems"], frontend: ["findings", "recommendations", "risks", "assumptions", "missingInformation"], backend: ["findings", "recommendations", "risks", "assumptions", "missingInformation"], database: ["findings", "recommendations", "risks", "assumptions", "missingInformation"], testing: ["findings", "recommendations", "risks", "assumptions", "missingInformation"], security: ["findings", "recommendations", "risks", "assumptions", "missingInformation"], "business-operations": ["findings", "recommendations", "risks", "assumptions", "missingInformation"], marketing: ["findings", "recommendations", "risks", "assumptions", "missingInformation"], sales: ["findings", "recommendations", "risks", "assumptions", "missingInformation"], "customer-operations": ["findings", "recommendations", "risks", "assumptions", "missingInformation"], critic: ["findings", "contradictions", "missingEvidence", "requirementViolations", "riskConcerns", "recommendedRevisions"],
};
function objectToPlainString(value: unknown) { if (!record(value)) return undefined; const parts = Object.values(value).flatMap((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean" ? [String(item)] : Array.isArray(item) && item.every((entry) => typeof entry === "string") ? item : []); return parts.length ? parts.join(" — ") : undefined; }
export function canonicalizeWorkerResult(agentId: AgentId, value: unknown) {
  if (!record(value) || !record(value.output)) return value;
  const output = { ...value.output }; let changed = false;
  for (const field of stringArrayFields[agentId as EnabledAgentId] ?? []) if (Array.isArray(output[field])) { const normalized = output[field].map((item) => typeof item === "string" ? item : objectToPlainString(item) ?? item); if (normalized.some((item, index) => item !== (output[field] as unknown[])[index])) { output[field] = normalized; changed = true; } }
  return changed ? { ...value, output } : value;
}
const issue = (agentId: AgentId, stage: OutputValidationIssue["stage"], path: string, code: string, repairable: boolean): OutputValidationIssue => ({ specialist: agentId, stage, path, code, repairable });
function documentationOutputIssue(output: unknown): OutputValidationIssue | undefined {
  if (!record(output)) return issue("documentation", "schema", "$.output", "DOCUMENTATION_OUTPUT_OBJECT_REQUIRED", true);
  if (!isString(output.title)) return issue("documentation", "schema", "$.output.title", "DOCUMENTATION_TITLE_STRING_REQUIRED", true);
  if (!isString(output.purpose)) return issue("documentation", "schema", "$.output.purpose", "DOCUMENTATION_PURPOSE_STRING_REQUIRED", true);
  if (!Array.isArray(output.sections)) return issue("documentation", "schema", "$.output.sections", "DOCUMENTATION_SECTIONS_ARRAY_REQUIRED", true);
  for (let index = 0; index < output.sections.length; index += 1) { const section = output.sections[index]; if (!record(section)) return issue("documentation", "schema", `$.output.sections[${index}]`, "DOCUMENTATION_SECTION_OBJECT_REQUIRED", true); if (!isString(section.heading)) return issue("documentation", "schema", `$.output.sections[${index}].heading`, "DOCUMENTATION_SECTION_HEADING_STRING_REQUIRED", true); if (!isString(section.content)) return issue("documentation", "schema", `$.output.sections[${index}].content`, "DOCUMENTATION_SECTION_CONTENT_STRING_REQUIRED", true); }
  if (!strings(output.actionItems)) return issue("documentation", "schema", "$.output.actionItems", "DOCUMENTATION_ACTION_ITEMS_STRING_ARRAY_REQUIRED", true);
  if (!strings(output.unresolvedItems)) return issue("documentation", "schema", "$.output.unresolvedItems", "DOCUMENTATION_UNRESOLVED_ITEMS_STRING_ARRAY_REQUIRED", true);
  return undefined;
}

function validOutput(agentId: EnabledAgentId, output: unknown) {
  if (!record(output)) return false;
  if (agentId === "guardian") return ["HEALTHY", "DEGRADED", "UNHEALTHY", "CRITICAL"].includes(String(output.status)) && strings(output.passed) && strings(output.failed) && strings(output.notChecked) && strings(output.findings) && strings(output.recommendations) && output.sourceChangesPerformed === false;
  if (agentId === "research") return strings(output.findings) && strings(output.knownFacts) && strings(output.informationGaps) && typeof output.externalResearchRequired === "boolean" && strings(output.recommendations);
  if (agentId === "seo") return isString(output.targetIntent) && strings(output.suggestedKeywords) && strings(output.titleSuggestions) && strings(output.metaDescriptionSuggestions) && strings(output.contentOutline) && strings(output.limitations);
  if (agentId === "blog") return isString(output.title) && isString(output.summary) && isString(output.body) && isString(output.suggestedSlug) && isString(output.callToAction) && strings(output.assumptions) && strings(output.missingInformation) && !("published" in output) && !("publishingStatus" in output);
  if (agentId === "analytics") return strings(output.observations) && strings(output.metricsUsed) && strings(output.trends) && strings(output.caveats) && strings(output.missingData) && strings(output.recommendations);
  if (agentId === "documentation") return isString(output.title) && isString(output.purpose) && Array.isArray(output.sections) && output.sections.every((item) => record(item) && isString(item.heading) && isString(item.content)) && strings(output.actionItems) && strings(output.unresolvedItems);
  if (agentId === "critic") return ["PASS", "PASS_WITH_WARNINGS", "REVISE", "REJECT", "NEEDS_INPUT"].includes(String(output.verdict)) && strings(output.findings) && strings(output.contradictions) && strings(output.missingEvidence) && strings(output.requirementViolations) && strings(output.riskConcerns) && strings(output.recommendedRevisions) && !Object.keys(output).some((key) => /reasoning|chainOfThought/i.test(key));
  return strings(output.findings) && strings(output.recommendations) && strings(output.risks) && strings(output.assumptions) && strings(output.missingInformation);
}

export function parseWorkerResult(task: AgentTask, rawValue: unknown): { ok: true; result: AgentResult; issues: OutputValidationIssue[] } | { ok: false; code: "WORKER_JSON_PARSE_FAILED" | "WORKER_SCHEMA_INVALID"; issues: OutputValidationIssue[] } {
  const value = canonicalizeWorkerResult(task.agentId, rawValue);
  if (!record(value)) return { ok: false, code: "WORKER_JSON_PARSE_FAILED", issues: [issue(task.agentId, "json_parse", "$", "WORKER_JSON_PARSE_FAILED", true)] };
  const expectedVersion = workerSchemaVersions[task.agentId as EnabledAgentId];
  const identityChecks: Array<[boolean, string, string, boolean]> = [[value.schemaVersion === expectedVersion, "$.schemaVersion", "WORKER_SCHEMA_VERSION_INVALID", true], [value.agentId === task.agentId, "$.agentId", "WORKER_AGENT_ID_INVALID", false], [value.taskId === task.taskId, "$.taskId", "WORKER_TASK_ID_INVALID", false], [["completed", "failed", "needs_input"].includes(String(value.status)), "$.status", "WORKER_STATUS_INVALID", true], [isString(value.summary) && Boolean(value.summary.trim()), "$.summary", "WORKER_SUMMARY_INVALID", true], [optionalStrings(value.warnings), "$.warnings", "WORKER_WARNINGS_INVALID", true], [optionalStrings(value.missingInformation), "$.missingInformation", "WORKER_MISSING_INFORMATION_INVALID", true]];
  const failedIdentity = identityChecks.find(([valid]) => !valid); if (!expectedVersion || failedIdentity) return { ok: false, code: "WORKER_SCHEMA_INVALID", issues: [issue(task.agentId, "schema", failedIdentity?.[1] ?? "$.schemaVersion", failedIdentity?.[2] ?? "WORKER_SCHEMA_VERSION_INVALID", failedIdentity?.[3] ?? true)] };
  if (value.status === "completed" && !validOutput(task.agentId as EnabledAgentId, value.output)) { const output = record(value.output) ? value.output : {}; const documentationIssue = task.agentId === "documentation" ? documentationOutputIssue(value.output) : undefined; const badField = (stringArrayFields[task.agentId as EnabledAgentId] ?? []).find((field) => !strings(output[field])); return { ok: false, code: "WORKER_SCHEMA_INVALID", issues: [documentationIssue ?? issue(task.agentId, "schema", badField ? `$.output.${badField}` : "$.output", "WORKER_OUTPUT_SCHEMA_INVALID", true)] }; }
  if (value.status === "needs_input" && (!Array.isArray(value.missingInformation) || !value.missingInformation.length)) return { ok: false, code: "WORKER_SCHEMA_INVALID", issues: [issue(task.agentId, "schema", "$.missingInformation", "WORKER_NEEDS_INPUT_DETAILS_REQUIRED", true)] };
  const availableRefs = new Set(task.context.sections.flatMap((source) => source && typeof source === "object" && typeof (source as { sourceRef?: unknown }).sourceRef === "string" ? [(source as { sourceRef: string }).sourceRef] : []));
  if (value.sourceRefs !== undefined && (!Array.isArray(value.sourceRefs) || value.sourceRefs.some((item) => typeof item !== "string" || !availableRefs.has(item)))) return { ok: false, code: "WORKER_SCHEMA_INVALID", issues: [issue(task.agentId, "schema", "$.sourceRefs", "WORKER_SOURCE_REF_UNAUTHORIZED", false)] };
  const sourceRefs = Array.isArray(value.sourceRefs) ? value.sourceRefs as string[] : [];
  return { ok: true, issues: [], result: { schemaVersion: expectedVersion, taskId: task.taskId, agentId: task.agentId, status: value.status as AgentResult["status"], summary: value.summary as string, ...(value.output === undefined ? {} : { output: value.output }), ...(value.warnings ? { warnings: value.warnings as string[] } : {}), ...(value.missingInformation ? { missingInformation: value.missingInformation as string[] } : {}), ...(sourceRefs.length ? { sourceRefs } : {}) } };
}

export function schemaPrompt(agentId: AgentId) {
  const version = workerSchemaVersions[agentId as EnabledAgentId];
  const fields: Record<EnabledAgentId, string> = {
    guardian: '"status":"HEALTHY|DEGRADED|UNHEALTHY|CRITICAL","passed":["plain string"],"failed":["plain string"],"notChecked":["plain string"],"findings":["plain string"],"recommendations":["plain string"],"sourceChangesPerformed":false',
    research: '"findings":["plain string"],"knownFacts":["plain string"],"informationGaps":["plain string"],"externalResearchRequired":false,"recommendations":["plain string"]',
    seo: '"targetIntent":"","suggestedKeywords":["plain string"],"titleSuggestions":["plain string"],"metaDescriptionSuggestions":["plain string"],"contentOutline":["plain string"],"limitations":["plain string"]',
    blog: '"title":"","summary":"","body":"","suggestedSlug":"","callToAction":"","assumptions":["plain string"],"missingInformation":["plain string"]',
    analytics: '"observations":["plain string"],"metricsUsed":["plain string"],"trends":["plain string"],"caveats":["plain string"],"missingData":["plain string"],"recommendations":["plain string"]',
    documentation: '"title":"","purpose":"","sections":[{"heading":"plain string","content":"plain string"}],"actionItems":["plain string"],"unresolvedItems":["plain string"]',
    frontend: '"findings":["plain string"],"recommendations":["plain string"],"risks":["plain string"],"assumptions":["plain string"],"missingInformation":["plain string"]',
    backend: '"findings":["plain string"],"recommendations":["plain string"],"risks":["plain string"],"assumptions":["plain string"],"missingInformation":["plain string"]',
    database: '"findings":["plain string"],"recommendations":["plain string"],"risks":["plain string"],"assumptions":["plain string"],"missingInformation":["plain string"]',
    testing: '"findings":["plain string"],"recommendations":["plain string"],"risks":["plain string"],"assumptions":["plain string"],"missingInformation":["plain string"]',
    security: '"findings":["plain string"],"recommendations":["plain string"],"risks":["plain string"],"assumptions":["plain string"],"missingInformation":["plain string"]',
    "business-operations": '"findings":["plain string"],"recommendations":["plain string"],"risks":["plain string"],"assumptions":["plain string"],"missingInformation":["plain string"]',
    marketing: '"findings":["plain string"],"recommendations":["plain string"],"risks":["plain string"],"assumptions":["plain string"],"missingInformation":["plain string"]',
    sales: '"findings":["plain string"],"recommendations":["plain string"],"risks":["plain string"],"assumptions":["plain string"],"missingInformation":["plain string"]',
    "customer-operations": '"findings":["plain string"],"recommendations":["plain string"],"risks":["plain string"],"assumptions":["plain string"],"missingInformation":["plain string"]',
    critic: '"verdict":"PASS|PASS_WITH_WARNINGS|REVISE|REJECT|NEEDS_INPUT","findings":["plain string"],"contradictions":["plain string"],"missingEvidence":["plain string"],"requirementViolations":["plain string"],"riskConcerns":["plain string"],"recommendedRevisions":["plain string"]',
  };
  return `Required schema: {"schemaVersion":"${version}","agentId":"${agentId}","taskId":"<exact task id>","status":"completed|failed|needs_input","summary":"", "output":{${fields[agentId as EnabledAgentId]}},"warnings":[],"missingInformation":[],"sourceRefs":["only supplied source refs actually used"]}. Fields shown as ["plain string"] must contain plain strings only, never objects.`;
}
