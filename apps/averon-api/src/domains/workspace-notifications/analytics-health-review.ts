import type { AgentTask } from "@averon/agent-contracts";
import type { WorkspaceHealthEvidence } from "@averon/shared-types";
import type { AiProvider } from "../../ai/providers/ai-provider.ts";
import { DefaultAgentRegistry } from "../../ai/agents/registry.ts";
import { ProviderSpecialistWorker } from "../../ai/agents/worker.ts";
import { AgentResultValidator } from "../../ai/agents/validator.ts";
import { ApiError } from "../../errors/api-error.ts";
import type { DiagnosticsStore } from "../../ai/diagnostics/diagnostics.store.ts";
import type { WorkspaceHealthEvidenceCollector } from "./workspace-notification.service.ts";

export interface WorkspaceHealthAnalysis { observed: string[]; suggested: string[]; providerCalls: number }
export interface WorkspaceHealthAnalyzer { analyze(input: { requestId?: string; workspace: { id: string; name: string }; business: { id: string; name: string }; evidence: WorkspaceHealthEvidence; allowedObserved: string[] }): Promise<WorkspaceHealthAnalysis> }

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");

export class AnalyticsWorkspaceHealthAnalyzer implements WorkspaceHealthAnalyzer {
  private readonly provider: AiProvider;
  private readonly registry = new DefaultAgentRegistry();
  constructor(provider: AiProvider) { this.provider = provider; }
  async analyze(input: { requestId?: string; workspace: { id: string; name: string }; business: { id: string; name: string }; evidence: WorkspaceHealthEvidence; allowedObserved: string[] }) {
    const definition = this.registry.get("analytics"); if (!definition) throw new ApiError(503, "HEALTH_REVIEW_SPECIALIST_UNAVAILABLE", "The Analytics specialist is unavailable.");
    const task: AgentTask = { taskId: `health-review-${input.requestId ?? input.workspace.id}`, workspaceId: input.workspace.id, businessId: input.business.id, agentId: "analytics", taskType: "analytics", objective: "Analyze authoritative workspace health evidence and provide advisory recommendations.", input: input.evidence, constraints: ["read-only", "advisory only", "no tools", "no mutation", "no deployment", "observations must exactly match an allowed observed statement"], approvalPolicy: "never", expectedOutput: "analytics.v1", context: { workspace: input.workspace, business: input.business, sections: [{ sourceRef: "workspace-health-evidence", evidence: input.evidence, allowedObservedStatements: input.allowedObserved }], upstreamResults: [], userRequest: JSON.stringify({ authoritativeHealthEvidence: input.evidence, allowedObservedStatements: input.allowedObserved, outputUse: { observations: "OBSERVED", recommendations: "SUGGESTED" } }) } };
    const execution = await new ProviderSpecialistWorker(definition, this.provider).execute(task, input.requestId, definition.maxProviderCalls);
    const validated = new AgentResultValidator().validate(task, execution.result);
    if (validated.status !== "completed" || !record(validated.output) || !strings(validated.output.observations) || !strings(validated.output.recommendations)) throw new ApiError(502, "HEALTH_REVIEW_SPECIALIST_FAILED", "The Analytics health review did not produce a valid report.");
    if (validated.output.observations.some((item) => !input.allowedObserved.includes(item))) throw new ApiError(422, "HEALTH_REVIEW_UNGROUNDED_OBSERVATION", "The Analytics health review included an observation not present in the authoritative evidence.");
    return { observed: [...validated.output.observations], suggested: [...validated.output.recommendations], providerCalls: execution.providerCalls };
  }
}

export class DiagnosticsWorkspaceHealthEvidenceCollector implements WorkspaceHealthEvidenceCollector {
  private readonly diagnostics: DiagnosticsStore;
  constructor(diagnostics: DiagnosticsStore) { this.diagnostics = diagnostics; }
  async collect(workspaceId: string): Promise<WorkspaceHealthEvidence> {
    const items = await this.diagnostics.list(100, new Set([workspaceId]));
    return { runtimeFailureCount: items.filter((item) => item.finalStatus === "failed" || item.finalStatus === "partial").length, failedOperationCount: items.filter((item) => item.operationStatus === "failed" || item.operationStatus === "rolled_back" || item.operationStatus === "rejected").length };
  }
}
