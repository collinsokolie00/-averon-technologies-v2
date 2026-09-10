import type { AiDiagnostic, EmmyActionMetadata, OperationLifecycleStatus } from "@averon/shared-types";
import type { Firestore } from "firebase-admin/firestore";
import { getFirebaseAdminServices } from "../../services/firebase/admin.ts";
export interface DiagnosticsStore { add(entry: AiDiagnostic): Promise<void>; recordOperation?(requestId: string, action: EmmyActionMetadata, context?: { workspaceId: string; businessId: string; startedAt?: string }): Promise<void>; linkTask?(requestId: string, taskId: string): Promise<void>; list(limit?: number, workspaceIds?: Set<string>): Promise<AiDiagnostic[]>; get(requestId: string, workspaceIds?: Set<string>): Promise<AiDiagnostic | null>; getOperation?(operationId: string, workspaceIds?: Set<string>): Promise<AiDiagnostic | null> }
export interface DiagnosticsRepository { getByRequest(requestId: string): Promise<AiDiagnostic | null>; getByOperation(operationId: string): Promise<AiDiagnostic | null>; list(workspaceIds?: Set<string>): Promise<AiDiagnostic[]>; save(entry: AiDiagnostic): Promise<void> }
export function authoritativeOperationStatus(action: EmmyActionMetadata): OperationLifecycleStatus { if (action.warnings.some((warning) => /ALREADY_SATISFIED|no change|idempotent/i.test(warning))) return "no_change_required"; if ("rollbackStatus" in action && action.rollbackStatus === "completed") return "rolled_back"; if (action.status === "approval_required" || action.status === "proposed" || ("approvalStatus" in action && action.approvalStatus === "pending" && action.status !== "failed")) return "awaiting_approval"; if (action.status === "applying" || action.status === "executing") return "applying"; if (action.status === "verifying") return "verifying"; if (action.status === "rejected" || action.status === "cancelled") return "rejected"; if (action.status === "failed" || action.verificationStatus === "failed") return "failed"; return action.status === "completed" && action.verificationStatus === "passed" ? "completed" : "failed"; }
export function diagnosticsRetention(env: NodeJS.ProcessEnv) { const maximum = Number(env.AI_DIAGNOSTICS_MAX_ENTRIES ?? env.AI_DIAGNOSTICS_MAX_RECORDS ?? 100); const days = Number(env.AI_DIAGNOSTICS_RETENTION_DAYS ?? 7); if (!Number.isInteger(maximum) || maximum < 1 || maximum > 500 || !Number.isInteger(days) || days < 1 || days > 90) throw new Error("AI diagnostics retention configuration is invalid."); return { maximum, days }; }
export function serializeDiagnostic(entry: AiDiagnostic): AiDiagnostic {
  return {
    requestId: entry.requestId, workspaceId: entry.workspaceId, businessId: entry.businessId, startedAt: entry.startedAt, durationMs: entry.durationMs, finalStatus: entry.finalStatus,
    plan: structuredClone(entry.plan), tasks: structuredClone(entry.tasks), citations: structuredClone(entry.citations), requestDecision: entry.requestDecision ? structuredClone(entry.requestDecision) : undefined,
    groundedClaimCount: entry.groundedClaimCount, unsupportedClaimCount: entry.unsupportedClaimCount, attributionValidation: entry.attributionValidation,
    synthesisValidationIssues: entry.synthesisValidationIssues ? structuredClone(entry.synthesisValidationIssues) : undefined, synthesisAttempts: entry.synthesisAttempts ? structuredClone(entry.synthesisAttempts) : undefined,
    requestedSkills: entry.requestedSkills ? [...entry.requestedSkills] : undefined, candidateCount: entry.candidateCount, selectedAgentIds: entry.selectedAgentIds ? [...entry.selectedAgentIds] : undefined,
    readinessFailures: entry.readinessFailures ? [...entry.readinessFailures] : undefined, skillCoverage: entry.skillCoverage ? structuredClone(entry.skillCoverage) : undefined,
    unresolvedSkills: entry.unresolvedSkills ? [...entry.unresolvedSkills] : undefined, selectedTeamSize: entry.selectedTeamSize, dependencies: entry.dependencies ? structuredClone(entry.dependencies) : undefined,
    verificationRequirement: entry.verificationRequirement, verifierStatus: entry.verifierStatus, tasksCompleted: entry.tasksCompleted, tasksFailed: entry.tasksFailed,
    verifierInterventions: entry.verifierInterventions, needsInputCount: entry.needsInputCount, contradictionCount: entry.contradictionCount, criticInvoked: entry.criticInvoked,
    partialFailureCount: entry.partialFailureCount, budgetStatus: entry.budgetStatus, safeSynthesis: entry.safeSynthesis, errorCodes: [...entry.errorCodes], providerCalls: entry.providerCalls,
    tokenUsage: structuredClone(entry.tokenUsage), operationStatus: entry.operationStatus, operationAction: entry.operationAction, operationId: entry.operationId,
    operationRequestIds: entry.operationRequestIds ? [...entry.operationRequestIds] : undefined, operationTransitions: entry.operationTransitions ? structuredClone(entry.operationTransitions) : undefined,
    diagnosticUpdatedAt: entry.diagnosticUpdatedAt, taskId: entry.taskId, guardianExecution: entry.guardianExecution ? structuredClone(entry.guardianExecution) : undefined,
  };
}
export class MemoryDiagnosticsRepository implements DiagnosticsRepository {
  readonly entries = new Map<string, AiDiagnostic>();
  async getByRequest(requestId: string) { return structuredClone([...this.entries.values()].find((item) => item.requestId === requestId || item.operationRequestIds?.includes(requestId)) ?? null); }
  async getByOperation(operationId: string) { return structuredClone([...this.entries.values()].find((item) => item.operationId === operationId) ?? null); }
  async list(workspaceIds?: Set<string>) { return [...this.entries.values()].reverse().filter((item) => !workspaceIds || workspaceIds.has(item.workspaceId)).map((item) => structuredClone(item)); }
  async save(entry: AiDiagnostic) { this.entries.set(entry.requestId, structuredClone(entry)); }
}
export class FirebaseDiagnosticsRepository implements DiagnosticsRepository {
  private readonly db: Firestore;
  constructor(db: Firestore = getFirebaseAdminServices().firestore) { this.db = db; }
  private collection() { return this.db.collection("aiDiagnostics"); }
  async getByRequest(requestId: string) { const direct = await this.collection().doc(requestId).get(); if (direct.exists) return direct.data() as AiDiagnostic; const found = await this.collection().where("operationRequestIds", "array-contains", requestId).limit(1).get(); return found.empty ? null : found.docs[0]!.data() as AiDiagnostic; }
  async getByOperation(operationId: string) { const found = await this.collection().where("operationId", "==", operationId).limit(1).get(); return found.empty ? null : found.docs[0]!.data() as AiDiagnostic; }
  async list(workspaceIds?: Set<string>) { if (!workspaceIds) { const found = await this.collection().get(); return found.docs.map((doc) => doc.data() as AiDiagnostic); } if (!workspaceIds.size) return []; const found = await Promise.all([...workspaceIds].map((workspaceId) => this.collection().where("workspaceId", "==", workspaceId).get())); return found.flatMap((snapshot) => snapshot.docs.map((doc) => doc.data() as AiDiagnostic)); }
  async save(entry: AiDiagnostic) { const safe = JSON.parse(JSON.stringify(serializeDiagnostic(entry))) as AiDiagnostic; await this.collection().doc(entry.requestId).set(safe); }
}
export class AiDiagnosticsStore implements DiagnosticsStore {
  private readonly maximum: number; private readonly retentionMs: number; private readonly repository: DiagnosticsRepository;
  constructor(maximum = 100, retentionDays = 7, repository: DiagnosticsRepository = new MemoryDiagnosticsRepository()) { this.maximum = Math.max(1, Math.min(maximum, 500)); this.retentionMs = Math.max(1, Math.min(retentionDays, 90)) * 86_400_000; this.repository = repository; }
  private retained(entries: AiDiagnostic[]) { const cutoff = Date.now() - this.retentionMs; return entries.filter((item) => Date.parse(item.startedAt) >= cutoff).sort((a, b) => (b.diagnosticUpdatedAt ?? b.startedAt).localeCompare(a.diagnosticUpdatedAt ?? a.startedAt)).slice(0, this.maximum); }
  private safe(item: AiDiagnostic) { return serializeDiagnostic(item); }
  async add(entry: AiDiagnostic) { const existing = await this.repository.getByRequest(entry.requestId); await this.repository.save({ ...(existing?.operationId ? { ...entry, operationStatus: existing.operationStatus, operationAction: existing.operationAction, operationId: existing.operationId, operationRequestIds: existing.operationRequestIds, operationTransitions: existing.operationTransitions } : entry), diagnosticUpdatedAt: new Date().toISOString() }); }
  async linkTask(requestId: string, taskId: string) { const item = await this.repository.getByRequest(requestId); if (item) await this.repository.save({ ...item, taskId, diagnosticUpdatedAt: new Date().toISOString() }); }
  async recordOperation(requestId: string, action: EmmyActionMetadata, context?: { workspaceId: string; businessId: string; startedAt?: string }) {
    let item = await this.repository.getByOperation(action.actionId) ?? await this.repository.getByRequest(requestId);
    if (!item && context) {
      item = { requestId, workspaceId: context.workspaceId, businessId: context.businessId, startedAt: context.startedAt ?? new Date().toISOString(), durationMs: 0, finalStatus: "completed", plan: { taskCount: 0, agentIds: [] }, tasks: [], citations: [], errorCodes: [], providerCalls: 0, tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
    }
    if (!item) return;
    const status = authoritativeOperationStatus(action); const occurredAt = new Date().toISOString(); item.operationStatus = status; item.operationAction = action.actionType; item.operationId = action.actionId; item.operationRequestIds = [...new Set([...(item.operationRequestIds ?? [item.requestId]), requestId])]; const last = item.operationTransitions?.at(-1); if (!last || last.status !== status) item.operationTransitions = [...(item.operationTransitions ?? []), { status, occurredAt, requestId }]; item.diagnosticUpdatedAt = occurredAt; item.durationMs = Math.max(0, Date.now() - Date.parse(item.startedAt));
    item.finalStatus = status === "completed" || status === "no_change_required" || status === "awaiting_approval" || status === "applying" || status === "verifying" ? "completed" : "failed";
    await this.repository.save(item);
  }
  async list(limit = 25, workspaceIds?: Set<string>) { return this.retained(await this.repository.list(workspaceIds)).slice(0, Math.max(1, Math.min(limit, 100))).map((item) => this.safe(item)); }
  async get(requestId: string, workspaceIds?: Set<string>) { const item = await this.repository.getByRequest(requestId); return item && (!workspaceIds || workspaceIds.has(item.workspaceId)) ? this.safe(item) : null; }
  async getOperation(operationId: string, workspaceIds?: Set<string>) { const item = await this.repository.getByOperation(operationId); return item && (!workspaceIds || workspaceIds.has(item.workspaceId)) ? this.safe(item) : null; }
  async size() { return this.retained(await this.repository.list()).length; }
}
