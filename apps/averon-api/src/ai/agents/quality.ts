import type { AgentResult, PlannedTask } from "@averon/agent-contracts";

export type ContradictionResolution = "prefer_grounded" | "needs_input";
export interface QualityClaim { resultId: string; subject: string; value: string; sourceRefs: string[] }
export interface ContradictionRecord { subject: string; resultIds: string[]; values: string[]; evidenceRefs: string[]; resolution: ContradictionResolution; preferredResultId?: string }

/** Deterministic claim comparison for evaluation and safe metadata; it never stores prose reasoning. */
export function detectStructuredContradictions(claims: readonly QualityClaim[]): ContradictionRecord[] {
  const groups = new Map<string, QualityClaim[]>();
  for (const claim of claims) {
    const key = claim.subject.trim().toLocaleLowerCase();
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), claim]);
  }
  const contradictions: ContradictionRecord[] = [];
  for (const [subject, group] of groups) {
    const values = [...new Set(group.map((claim) => claim.value.trim().toLocaleLowerCase()).filter(Boolean))];
    if (values.length < 2) continue;
    const grounded = group.filter((claim) => claim.sourceRefs.length > 0);
    const groundedValues = [...new Set(grounded.map((claim) => claim.value.trim().toLocaleLowerCase()))];
    const preferred = grounded.length === 1 || groundedValues.length === 1 ? grounded[0] : undefined;
    contradictions.push({ subject, resultIds: [...new Set(group.map((claim) => claim.resultId))], values, evidenceRefs: [...new Set(group.flatMap((claim) => claim.sourceRefs))], resolution: preferred ? "prefer_grounded" : "needs_input", ...(preferred ? { preferredResultId: preferred.resultId } : {}) });
  }
  return contradictions;
}

export interface OrchestrationSafetyAssessment { safeToSynthesize: boolean; partialFailureCount: number; requiredFailureCount: number; optionalFailureCount: number; criticFailed: boolean; needsInputCount: number }
export function assessOrchestrationSafety(tasks: readonly PlannedTask[], results: readonly AgentResult[]): OrchestrationSafetyAssessment {
  const byTask = new Map(results.map((result) => [result.taskId, result]));
  let requiredFailureCount = 0; let optionalFailureCount = 0; let needsInputCount = 0; let criticFailed = false;
  for (const task of tasks) {
    const result = byTask.get(task.taskId); const unsuccessful = !result || result.status === "failed";
    if (result?.status === "needs_input") needsInputCount += 1;
    if (task.agentId === "critic" && unsuccessful) criticFailed = true;
    if (unsuccessful) {
      if (task.dependencyPolicy === "optional") optionalFailureCount += 1;
      else requiredFailureCount += 1;
    }
  }
  return { safeToSynthesize: requiredFailureCount === 0 && !criticFailed, partialFailureCount: requiredFailureCount + optionalFailureCount, requiredFailureCount, optionalFailureCount, criticFailed, needsInputCount };
}

export type CriticVerdict = "PASS" | "PASS_WITH_WARNINGS" | "REVISE" | "REJECT" | "NEEDS_INPUT";
export function expectedCriticVerdict(input: { findings?: string[]; contradictions?: string[]; missingEvidence?: string[]; requirementViolations?: string[]; riskConcerns?: string[]; executionViolation?: boolean; crossWorkspaceEvidence?: boolean }): CriticVerdict {
  if (input.executionViolation || input.crossWorkspaceEvidence) return "REJECT";
  if (input.requirementViolations?.length || input.contradictions?.length || input.riskConcerns?.length) return "REVISE";
  if (input.missingEvidence?.length) return "NEEDS_INPUT";
  if (input.findings?.length) return "PASS_WITH_WARNINGS";
  return "PASS";
}
