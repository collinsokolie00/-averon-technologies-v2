import type { AiDiagnostic, WorkspaceRunDetail, WorkspaceRunSpecialist, WorkspaceRunsResponse, WorkspaceRunSummary, WorkspaceRunTraceStage } from "@averon/shared-types";
import type { AuthContext } from "../../services/auth/authentication.ts";
import type { WorkspaceAuthorizationService } from "../../domains/workspaces/workspace.service.ts";
import type { DiagnosticsStore } from "../diagnostics/diagnostics.store.ts";
import { ApiError } from "../../errors/api-error.ts";
import { agentDisplayIdentities } from "../agents/catalog.ts";

const actionTitles: Record<string, string> = {
  "seo.metadata.read": "SEO Metadata Review", "seo.metadata.update": "SEO Metadata Update",
  "frontend.source.propose": "Frontend Source Proposal", "frontend.source.apply": "Frontend Source Update",
  "backend.source.propose": "Backend Source Proposal", "backend.source.apply": "Backend Source Update",
  "blog.draft.create": "Blog Draft Creation", "blog.draft.update": "Blog Draft Update",
  "page.content.update": "Page Content Update",
};
const humanize = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const titleFor = (item: AiDiagnostic) => item.operationAction ? actionTitles[item.operationAction] ?? item.operationAction.split(".").map(humanize).join(" ") : item.plan.agentIds.length ? "Emmy Specialist Run" : "Emmy Run";
const statusFor = (item: AiDiagnostic) => item.operationStatus ?? item.finalStatus;
const validationFor = (item: AiDiagnostic): "valid" | "failed" => item.attributionValidation === "failed" || item.tasks.some((task) => task.validationStatus === "failed") ? "failed" : "valid";

export class WorkspaceRunsService {
  private readonly workspaces: WorkspaceAuthorizationService;
  private readonly diagnostics: DiagnosticsStore;
  constructor(workspaces: WorkspaceAuthorizationService, diagnostics: DiagnosticsStore) { this.workspaces = workspaces; this.diagnostics = diagnostics; }
  private identity(id: string) { return { id, ...(agentDisplayIdentities[id] ?? { displayName: id, displayRole: "Specialist" }) }; }
  private summary(item: AiDiagnostic, workspace: { id: string; name: string }): WorkspaceRunSummary { const specialistIds = item.selectedAgentIds ?? item.plan.agentIds; return { operationId: item.operationId ?? item.requestId, requestId: item.requestId, title: titleFor(item), workspace, status: statusFor(item), startedAt: item.startedAt, updatedAt: item.diagnosticUpdatedAt ?? item.startedAt, durationMs: item.durationMs, specialistIds: [...specialistIds], specialists: specialistIds.map((id) => this.identity(id)), actionType: item.operationAction, taskId: item.taskId, errorCodes: [...item.errorCodes] }; }
  private specialistDetails(item: AiDiagnostic): WorkspaceRunSpecialist[] { return item.tasks.map((task) => { const skills = Object.entries(item.skillCoverage ?? {}).filter(([, agentId]) => agentId === task.agentId).map(([skill]) => skill); return { ...this.identity(task.agentId), status: task.status, skills, providerCalls: task.providerCalls, validationStatus: task.validationStatus, durationMs: task.durationMs }; }); }
  private trace(item: AiDiagnostic, specialists: WorkspaceRunSpecialist[]): WorkspaceRunTraceStage[] { const stages: WorkspaceRunTraceStage[] = [{ kind: "request", label: "Request received" }]; if (item.plan.agentIds.length) stages.push({ kind: "planner", label: "Planner selected specialist team" }); for (const specialist of specialists) { stages.push({ kind: "specialist", label: `${specialist.displayName} · ${specialist.displayRole}`, status: specialist.status }); for (const skill of specialist.skills) stages.push({ kind: "skill", label: skill }); } if (item.operationAction) stages.push({ kind: "action", label: item.operationAction }); for (const transition of item.operationTransitions ?? []) stages.push({ kind: "lifecycle", label: humanize(transition.status), status: transition.status, occurredAt: transition.occurredAt }); if (!item.operationTransitions?.length) stages.push({ kind: "completion", label: humanize(item.finalStatus), status: item.finalStatus }); return stages; }
  async list(auth: AuthContext, workspaceId: string, limit = 50): Promise<WorkspaceRunsResponse> { const context = await this.workspaces.requirePermission(auth, workspaceId, "workspace:read"); const workspace = { id: context.workspace.id, name: context.workspace.name }; const items = await this.diagnostics.list(Math.max(1, Math.min(limit, 100)), new Set([workspaceId])); return { workspace, items: items.map((item) => this.summary(item, workspace)) }; }
  async get(auth: AuthContext, workspaceId: string, operationId: string): Promise<WorkspaceRunDetail> { const context = await this.workspaces.requirePermission(auth, workspaceId, "workspace:read"); const scope = new Set([workspaceId]); const item = await this.diagnostics.getOperation?.(operationId, scope) ?? await this.diagnostics.get(operationId, scope); if (!item) throw new ApiError(404, "RUN_NOT_FOUND", "The run was not found."); const workspace = { id: context.workspace.id, name: context.workspace.name }; const specialists = this.specialistDetails(item); return { ...this.summary(item, workspace), requestIds: [...(item.operationRequestIds ?? [item.requestId])], requestedSkills: [...(item.requestedSkills ?? [])], skillCoverage: { ...(item.skillCoverage ?? {}) }, specialistDetails: specialists, providerCalls: item.providerCalls, validationStatus: validationFor(item), criticInvoked: Boolean(item.criticInvoked), criticVerdict: item.verifierStatus, tokenUsage: { ...item.tokenUsage }, grounding: { citationCount: item.citations.length, groundedClaimCount: item.groundedClaimCount, unsupportedClaimCount: item.unsupportedClaimCount }, actionTransitions: structuredClone(item.operationTransitions ?? []), trace: this.trace(item, specialists) }; }
}
