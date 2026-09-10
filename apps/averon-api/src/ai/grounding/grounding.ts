import type { BusinessOsCitation, BusinessOsSection, GroundedClaim, OutputValidationIssue } from "@averon/shared-types";

export interface AttributableSource { sourceRef: string; sectionType: BusinessOsSection["type"]; version: number; workspaceId: string; visibility: BusinessOsSection["visibility"]; title: string; content: BusinessOsSection["content"] }
export function attributableSources(sections: BusinessOsSection[], workspaceId: string): AttributableSource[] { return sections.filter((item) => item.workspaceId === workspaceId).map((item, index) => ({ sourceRef: `src_${index + 1}`, sectionType: item.type, version: item.version, workspaceId, visibility: item.visibility, title: item.title, content: item.content })); }
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const synthesisIssue = (path: string, code: string, repairable: boolean): OutputValidationIssue => ({ specialist: "emmy", stage: "synthesis", path, code, repairable });
export function canonicalizeSynthesisEnvelope(value: unknown) {
  const issues: OutputValidationIssue[] = [];
  if (!record(value)) return { value: null, issues: [synthesisIssue("$", "SYNTHESIS_OBJECT_REQUIRED", true)], structuralValid: false };
  const reply = value.reply; if (typeof reply !== "string" || !reply.trim()) issues.push(synthesisIssue("$.reply", typeof reply === "string" ? "SYNTHESIS_REPLY_EMPTY" : "SYNTHESIS_REPLY_REQUIRED", true));
  const rawClaims = value.claims === undefined ? [] : value.claims;
  if (!Array.isArray(rawClaims)) issues.push(synthesisIssue("$.claims", "SYNTHESIS_CLAIMS_ARRAY_REQUIRED", true));
  const claims = Array.isArray(rawClaims) ? rawClaims.map((candidate, index) => {
    if (!record(candidate)) { issues.push(synthesisIssue(`$.claims[${index}]`, "SYNTHESIS_CLAIM_OBJECT_REQUIRED", true)); return candidate; }
    const sourceRefs = typeof candidate.sourceRefs === "string" ? [candidate.sourceRefs] : candidate.sourceRefs;
    if (typeof candidate.text !== "string" || !candidate.text.trim()) issues.push(synthesisIssue(`$.claims[${index}].text`, "SYNTHESIS_CLAIM_TEXT_REQUIRED", true));
    if (!["business_os", "general", "worker_result"].includes(String(candidate.grounding))) issues.push(synthesisIssue(`$.claims[${index}].grounding`, "SYNTHESIS_CLAIM_GROUNDING_INVALID", true));
    if (!Array.isArray(sourceRefs) || !sourceRefs.every((ref) => typeof ref === "string")) issues.push(synthesisIssue(`$.claims[${index}].sourceRefs`, "SYNTHESIS_CLAIM_SOURCE_REFS_INVALID", true));
    return { text: candidate.text, grounding: candidate.grounding, sourceRefs };
  }) : rawClaims;
  return { value: { reply, claims }, issues, structuralValid: issues.length === 0 };
}
export function validateGroundedClaims(value: unknown, sources: AttributableSource[], workspaceId: string, externalSourceRefs: string[] = []) {
  const conformance = canonicalizeSynthesisEnvelope(value); const empty = { reply: "", claims: [] as GroundedClaim[], citations: [] as BusinessOsCitation[], valid: false, unsupportedClaims: 0, validationIssues: conformance.issues };
  if (!conformance.structuralValid || !conformance.value) return empty; const envelope = conformance.value as { reply: string; claims: unknown[] };
  const authorized = new Map(sources.filter((source) => source.workspaceId === workspaceId).map((source) => [source.sourceRef, source])); const authorizedExternal = new Set(externalSourceRefs.filter((ref) => /^https?:\/\//i.test(ref))); const claims: GroundedClaim[] = []; const rejectedTexts: string[] = []; let unsupportedClaims = 0;
  const validationIssues = [...conformance.issues];
  for (let index = 0; index < envelope.claims.length; index += 1) { const claim = envelope.claims[index] as { text: string; grounding: GroundedClaim["grounding"]; sourceRefs: string[] }; const suppliedRefs = claim.sourceRefs; const grounding = claim.grounding; let refs = [...new Set(suppliedRefs.filter((ref) => authorized.has(ref)))]; if (grounding === "business_os" && (refs.length === 0 || suppliedRefs.some((ref) => !authorized.has(ref)))) { unsupportedClaims += 1; rejectedTexts.push(claim.text); validationIssues.push(synthesisIssue(`$.claims[${index}].sourceRefs`, "SYNTHESIS_BUSINESS_SOURCE_UNAUTHORIZED", false)); continue; } if (grounding === "worker_result") { refs = [...new Set(suppliedRefs.filter((ref) => authorizedExternal.has(ref) || authorized.has(ref)))]; if (suppliedRefs.some((ref) => !authorizedExternal.has(ref) && !authorized.has(ref))) validationIssues.push(synthesisIssue(`$.claims[${index}].sourceRefs`, "SYNTHESIS_EXTERNAL_SOURCE_UNAUTHORIZED", false)); if (!refs.length && suppliedRefs.length) { unsupportedClaims += 1; rejectedTexts.push(claim.text); continue; } } if (grounding === "general") refs = []; claims.push({ text: claim.text, grounding, sourceRefs: refs }); }
  const used = [...new Set(claims.flatMap((claim) => claim.sourceRefs))]; const citations = used.flatMap((ref, index): BusinessOsCitation[] => { const source = authorized.get(ref); if (source) return [{ citationId: `c${index + 1}`, sectionType: source.sectionType, label: source.sectionType.replace(/\b\w/g, (character) => character.toUpperCase()), version: source.version }]; if (!authorizedExternal.has(ref)) return []; let label = "External research"; try { label = new URL(ref).hostname.replace(/^www\./, ""); } catch { /* URL was already allowlisted. */ } return [{ citationId: `c${index + 1}`, sectionType: "external", label, url: ref }]; });
  const filteredReply = rejectedTexts.reduce((text, rejected) => text.replace(rejected, ""), envelope.reply).replace(/\s{2,}/g, " ").trim();
  const reply = filteredReply || (unsupportedClaims ? "I don't have authorized Business OS support for that claim." : envelope.reply);
  return { reply, claims, citations, valid: true, unsupportedClaims, validationIssues };
}
