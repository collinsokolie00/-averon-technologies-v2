export type RequestDecisionKind =
  | "ADVISORY"
  | "READ_ONLY"
  | "MUTATION_REQUEST"
  | "APPROVAL_RESPONSE"
  | "CLARIFICATION_REQUIRED"
  | "UNSUPPORTED";

export type RequestDecision = {
  kind: RequestDecisionKind;
  target?: "blog_draft" | "seo_metadata" | "page_content" | "frontend_source" | "backend_source" | "proposal";
  requestedOutcome: "answer" | "recommendations" | "create" | "update" | "apply" | "reject" | "unknown";
  mutationIntent: boolean;
  prohibitedMutations: string[];
  approvalRequired: boolean;
  selectedCapability?: string;
  confidence: "high" | "medium" | "low";
  reasonCodes: string[];
};

const globalReadOnly = /\b(?:do\s+not|don't|without)\s+(?:modify|change|edit|update|write|alter|replace|apply|create|save)\s+(?:anything|any\s+(?:files?|source|code|content|records?|data))\b|\b(?:recommendations?|analysis|advice)\s+only\b/i;
const mutationVerb = /\b(?:create|make|write|draft|update|edit|revise|rewrite|change|set|strengthen|optimi[sz]e|add|fix|increase|decrease|adjust|replace|save|apply)\b/i;
const advisoryVerb = /\b(?:review|analyse|analyze|recommend|suggest|explain|summari[sz]e|compare|what\s+(?:is|was|changed|should)|how\s+(?:could|can|should)|show\s+me|give\s+me)\b/i;
const generatedAdvisoryArtifact = /\b(?:strategy|plan|analysis|report|documentation|document|sop|recommendations?|ideas?|keywords?|content)\b/i;
const approvalVerb = /\b(?:approve|apply|reject|decline|cancel)\b/i;
const unsupportedMutationVerb = /\b(?:delete|publish|deploy|send|email|message)\b/i;
const proposalReference = /\bproposal\b|\b(?:proposed|pending)\b[\s\S]{0,100}\bchange\b/i;

function targetOf(message: string): RequestDecision["target"] {
  if (proposalReference.test(message)) return "proposal";
  if (/\b(?:backend|api|server|endpoint|route|health)\b/i.test(message)) return "backend_source";
  if (/\b(?:frontend|component|tsx|css|stylesheet|layout|spacing|responsive)\b/i.test(message)) return "frontend_source";
  if (/\b(?:meta\s+description|seo\s+title|open\s+graph|metadata)\b/i.test(message)) return "seo_metadata";
  if (/\b(?:blog\s+draft|blog\s+post|article\s+draft|unpublished\s+draft|draft\s+[A-Za-z0-9_-]{8,})\b/i.test(message)) return "blog_draft";
  if (/\b(?:homepage|services\s+page|hero|primary\s+cta|page\s+content)\b/i.test(message)) return "page_content";
  return undefined;
}

function prohibited(message: string) {
  const values: string[] = [];
  const reviewableProposal = /\bprepare\b[\s\S]{0,160}\b(?:change|proposal)\b[\s\S]{0,80}\bfor\s+review\s+only\b/i.test(message);
  if (globalReadOnly.test(message) && !reviewableProposal) values.push("all_mutations");
  if (/\b(?:do\s+not|don't|without)\s+publish\b/i.test(message)) values.push("publish");
  if (/\b(?:do\s+not|don't|without)\s+deploy\b/i.test(message)) values.push("deploy");
  if (/\b(?:do\s+not|don't|without)\s+(?:send|message|email)\b/i.test(message)) values.push("send");
  if (/\b(?:do\s+not|don't|without)\s+delete\b/i.test(message)) values.push("delete");
  return values;
}

/**
 * Deterministic current-turn authority boundary. History may resolve a target in
 * domain adapters, but it can never provide mutation polarity.
 */
export function decideRequest(message: string, history: readonly { role: "user" | "assistant"; content: string }[] = []): RequestDecision {
  const current = message.trim();
  const authorityText = current.replace(/[“"'‘][^”"'’]*[”"'’]/g, " ");
  const positiveAuthorityText = authorityText.replace(/\b(?:do\s+not|don't|without)\s+(?:delete|publish|deploy|send|email|message)\b/gi, " ");
  const currentTarget = targetOf(current);
  const hasMutationVerb = mutationVerb.test(authorityText);
  const historicalTarget = hasMutationVerb ? [...history].reverse().map((item) => targetOf(item.content)).find(Boolean) : undefined;
  const target = currentTarget ?? historicalTarget;
  const prohibitedMutations = prohibited(current);
  const readOnly = prohibitedMutations.includes("all_mutations");
  const approval = approvalVerb.test(authorityText) && proposalReference.test(current);
  if (approval && !readOnly) {
    const reject = /\b(?:reject|decline|cancel)\b/i.test(authorityText);
    return { kind: "APPROVAL_RESPONSE", target: "proposal", requestedOutcome: reject ? "reject" : "apply", mutationIntent: true, prohibitedMutations, approvalRequired: true, selectedCapability: /\bbackend\b/i.test(current) ? "backend.source.apply" : "frontend.source.apply", confidence: "high", reasonCodes: [reject ? "CURRENT_TURN_REJECTION" : "CURRENT_TURN_APPROVAL"] };
  }
  if (unsupportedMutationVerb.test(positiveAuthorityText) && !readOnly) {
    return { kind: "UNSUPPORTED", target, requestedOutcome: "unknown", mutationIntent: true, prohibitedMutations, approvalRequired: false, confidence: "high", reasonCodes: ["ACTION_NOT_SUPPORTED"] };
  }
  const mutates = hasMutationVerb && Boolean(target) && !readOnly;
  if (mutates) {
    const create = /\b(?:create|make|write)\b/i.test(authorityText) && target === "blog_draft";
    const selectedCapability = target === "blog_draft" ? `blog.draft.${create ? "create" : "update"}` : target === "seo_metadata" ? "seo.metadata.update" : target === "page_content" ? "page.content.update" : target === "frontend_source" ? "frontend.source.propose" : target === "backend_source" ? "backend.source.propose" : undefined;
    return { kind: "MUTATION_REQUEST", target, requestedOutcome: create ? "create" : "update", mutationIntent: true, prohibitedMutations, approvalRequired: target === "frontend_source" || target === "backend_source", selectedCapability, confidence: "high", reasonCodes: ["CURRENT_TURN_EXPLICIT_MUTATION"] };
  }
  if (readOnly || advisoryVerb.test(current) || (hasMutationVerb && !target && generatedAdvisoryArtifact.test(current))) return { kind: readOnly || /\b(?:show\s+me|what\s+(?:is|was|changed)|summari[sz]e)\b/i.test(current) ? "READ_ONLY" : "ADVISORY", target, requestedOutcome: readOnly && !advisoryVerb.test(current) ? "answer" : "recommendations", mutationIntent: false, prohibitedMutations, approvalRequired: false, confidence: "high", reasonCodes: [readOnly ? "CURRENT_TURN_MUTATION_PROHIBITED" : "CURRENT_TURN_ADVISORY"] };
  if (hasMutationVerb && !target) return { kind: "CLARIFICATION_REQUIRED", requestedOutcome: "unknown", mutationIntent: false, prohibitedMutations, approvalRequired: false, confidence: "low", reasonCodes: ["TARGET_UNRESOLVED"] };
  return { kind: "READ_ONLY", target, requestedOutcome: "answer", mutationIntent: false, prohibitedMutations, approvalRequired: false, confidence: "medium", reasonCodes: ["NO_CURRENT_TURN_MUTATION"] };
}

export function permitsAction(decision: RequestDecision, phase: "proposal" | "approval") {
  return phase === "approval" ? decision.kind === "APPROVAL_RESPONSE" : decision.kind === "MUTATION_REQUEST";
}
