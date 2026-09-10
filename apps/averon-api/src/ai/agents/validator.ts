import type { AgentResult, AgentTask, OutputValidationIssue } from "@averon/agent-contracts";

const prohibited = /\b(I|we)\s+(published|deployed|emailed( the)?( customer)?|sent (an )?email|updated|deleted|changed (the )?(database|website|record)|charged (the )?(invoice|customer)|created (the )?record|executed|ran the code)\b/i;
const unsupportedLive = /\b(live|current)\s+(search volume|ranking|traffic|revenue)\b/i;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
function matchingPath(value: unknown, pattern: RegExp, path = "result"): string | undefined { if (typeof value === "string") return pattern.test(value) ? path : undefined; if (Array.isArray(value)) { for (let index = 0; index < value.length; index += 1) { const found = matchingPath(value[index], pattern, `${path}[${index}]`); if (found) return found; } } else if (isRecord(value)) for (const [key, nested] of Object.entries(value)) { const found = matchingPath(nested, pattern, `${path}.${key}`); if (found) return found; } return undefined; }
const disclaimerPolarity = /(?:\bno\b|\bnot\b|\bwithout\b|\bunavailable\b|\bunknown\b|\bmissing\b|\bnot\s+(?:supplied|provided|available|validated|known)\b|\b(?:lack|lacks|lacking)\b|\b(?:cannot|can't|do not|don't|does not|doesn't)\s+(?:claim|assert|verify|confirm|provide|have|know)\b|\b(?:requires?|needs?|would need|would be needed)\s+(?:access|evidence|data|validation|to provide)\b)/i;
function hasAffirmativeLiveClaim(value: string): boolean {
  const matches = value.matchAll(new RegExp(unsupportedLive.source, "ig"));
  for (const match of matches) {
    const index = match.index ?? 0;
    const prefix = value.slice(Math.max(0, index - 180), index);
    const boundary = Math.max(prefix.lastIndexOf("."), prefix.lastIndexOf(";"), prefix.lastIndexOf("\n"), prefix.search(/\b(?:but|however|although)\b[^\n.;&]*$/i));
    const clause = prefix.slice(boundary >= 0 ? boundary + 1 : 0);
    const suffix = value.slice(index + match[0].length, index + match[0].length + 120).split(/[.;\n]|\b(?:but|however|although)\b/i)[0] ?? "";
    if (!disclaimerPolarity.test(`${clause} ${suffix}`)) return true;
  }
  return false;
}
function affirmativeLiveClaimPath(value: unknown, path = "result"): string | undefined {
  if (typeof value === "string") return hasAffirmativeLiveClaim(value) ? path : undefined;
  if (Array.isArray(value)) { for (let index = 0; index < value.length; index += 1) { const found = affirmativeLiveClaimPath(value[index], `${path}[${index}]`); if (found) return found; } }
  else if (isRecord(value)) for (const [key, nested] of Object.entries(value)) { const found = affirmativeLiveClaimPath(nested, `${path}.${key}`); if (found) return found; }
  return undefined;
}
export class AgentResultValidator {
  validate(task: AgentTask, result: AgentResult): AgentResult {
    if (result.taskId !== task.taskId || result.agentId !== task.agentId) return this.failure(task, "AGENT_CONTEXT_MISMATCH", "The specialist result did not match its assigned task.", "result.taskId", false);
    if (!["completed", "failed", "needs_input"].includes(result.status) || typeof result.summary !== "string" || !result.summary.trim()) return this.failure(task, "MALFORMED_AGENT_RESULT", "The specialist result was incomplete.", "result.summary", true);
    const serialized = JSON.stringify({ summary: result.summary, output: result.output, warnings: result.warnings });
    if (prohibited.test(serialized)) return this.failure(task, "PROHIBITED_ACTION_CLAIM", "The specialist claimed a prohibited action.", matchingPath({ summary: result.summary, output: result.output, warnings: result.warnings }, prohibited) ?? "result", false);
    const safetyValue = { summary: result.summary, output: result.output, warnings: result.warnings };
    const liveClaimPath = affirmativeLiveClaimPath(safetyValue);
    if (liveClaimPath) return this.failure(task, "UNSUPPORTED_LIVE_DATA_CLAIM", "The specialist claimed unsupported live data.", liveClaimPath, false);
    return result;
  }
  private failure(task: AgentTask, code: string, message: string, path: string, repairable: boolean): AgentResult { const validationIssues: OutputValidationIssue[] = [{ specialist: task.agentId, stage: "safety", path, code, repairable }]; return { taskId: task.taskId, agentId: task.agentId, status: "failed", summary: message, error: { code, message, retryable: false }, validationIssues }; }
}
