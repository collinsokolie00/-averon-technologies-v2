import type { AgentContext, AgentId, AgentResult, AgentTask, OutputValidationIssue, ProviderExecutionStatus, SpecialistAttempt, SpecialistSettlement, SpecialistStopReason, TaskPlan } from "@averon/agent-contracts";
import type { WorkspacePermission } from "@averon/shared-types";
import { logAiOperation } from "../../observability/operations.ts";
import type { AiProvider } from "../providers/ai-provider.ts";
import type { DefaultAgentRegistry } from "./registry.ts";
import { ProviderSpecialistWorker } from "./worker.ts";
import type { AgentResultValidator } from "./validator.ts";
import type { ExternalResearchSource } from "../research/tavily.ts";
import { SpecialistTaskLifecycle } from "./task-lifecycle.ts";

export const MAX_PROVIDER_CALLS = 5; export const MAX_DEPENDENCY_DEPTH = 3;
type TraceTask = { taskId: string; agentId: AgentId; taskType: string; status: AgentResult["status"]; providerStatus: ProviderExecutionStatus; stopReason: SpecialistStopReason; attempt: number; createdAt: string; startedAt?: string; finishedAt: string; durationMs: number; providerCalls: number; tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number }; validationStatus: "valid" | "failed"; validationIssues?: OutputValidationIssue[]; attempts: SpecialistAttempt[] };
export interface OrchestrationTrace { requestId?: string; workspaceId: string; tasks: TraceTask[]; providerCalls: number; usage: { inputTokens: number; outputTokens: number; totalTokens: number }; durationMs: number }

const errorCode = (caught: unknown) => typeof caught === "object" && caught !== null && "code" in caught && typeof caught.code === "string" ? caught.code : "INTERNAL_ORCHESTRATION_ERROR";
const transientProviderError = (code: string) => ["AI_PROVIDER_TIMEOUT", "AI_PROVIDER_ERROR", "AI_PROVIDER_UNAVAILABLE", "EMMY_RATE_LIMITED", "EMMY_RESPONSE_FAILED"].includes(code);
const providerState = (code: string): ProviderExecutionStatus => code === "AI_PROVIDER_TIMEOUT" ? "timed_out" : code === "TASK_CANCELLED" ? "cancelled" : "failed";

export class AgentOrchestrator {
  constructor(registry: DefaultAgentRegistry, provider: AiProvider, validator: AgentResultValidator, researchSource?: ExternalResearchSource) { this.registry = registry; this.provider = provider; this.validator = validator; this.researchSource = researchSource; }
  private readonly registry: DefaultAgentRegistry; private readonly provider: AiProvider; private readonly validator: AgentResultValidator; private readonly researchSource?: ExternalResearchSource;

  async execute(plan: TaskPlan, baseContext: Omit<AgentContext, "upstreamResults">, permissions: WorkspacePermission[], requestId?: string, maximumSpecialistCalls = MAX_PROVIDER_CALLS - 1) {
    const started = Date.now(); const results: AgentResult[] = []; const settlements: SpecialistSettlement[] = []; const trace: OrchestrationTrace = { requestId, workspaceId: baseContext.workspace.id, tasks: [], providerCalls: 0, usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, durationMs: 0 };
    const rejectTask = (planned: TaskPlan["tasks"][number], code: string, specialistStatus: "available" | "unavailable" = "available") => { const result = this.failure(planned.taskId, planned.agentId, code); results.push(result); settlements.push({ taskId: planned.taskId, specialistId: planned.agentId, taskType: planned.taskType, specialistStatus, taskStatus: "failed", providerStatus: "not_started", stopReason: code === "TASK_CANCELLED" ? "cancelled" : "internal_error", attempt: 0, durationMs: 0, error: result.error, attempts: [] }); trace.tasks.push({ taskId: planned.taskId, agentId: planned.agentId, taskType: planned.taskType, status: "failed", providerStatus: "not_started", stopReason: "internal_error", attempt: 0, createdAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 0, providerCalls: 0, tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, validationStatus: "failed", attempts: [] }); logAiOperation({ event: "orchestration.task.failed", requestId, operation: "orchestration", channel: "private", authenticated: true, workspaceId: baseContext.workspace.id, businessId: baseContext.business.id, taskId: planned.taskId, specialistId: planned.agentId, taskType: planned.taskType, attempt: 0, providerStatus: "not_started", errorCode: code, success: false }); };
    if (plan.tasks.length > 4) throw new Error("AGENT_TASK_LIMIT_EXCEEDED");
    const pending = [...plan.tasks]; let passes = 0;
    while (pending.length) {
      if (++passes > MAX_DEPENDENCY_DEPTH + 1) { for (const item of pending) rejectTask(item, "AGENT_DEPENDENCY_DEPTH_EXCEEDED"); break; }
      let progressed = false;
      for (const planned of [...pending]) {
        if (!planned.dependencies.every((id) => results.some((result) => result.taskId === id))) continue;
        progressed = true; pending.splice(pending.indexOf(planned), 1);
        const dependencies = results.filter((result) => planned.dependencies.includes(result.taskId));
        if (planned.dependencyPolicy === "required" && dependencies.some((result) => result.status !== "completed")) { rejectTask(planned, "AGENT_DEPENDENCY_FAILED"); continue; }
        const definition = this.registry.get(planned.agentId);
        if (!definition?.enabled || definition.experimental) { rejectTask(planned, "SPECIALIST_UNAVAILABLE", "unavailable"); continue; }
        if (!definition.allowedTaskTypes.includes(planned.taskType)) { rejectTask(planned, "UNSUPPORTED_TASK"); continue; }
        if (definition.executionRights.some((right) => right.startsWith("execute_") || right === "prepare_action") || !definition.requiredPermissions.every((permission) => permissions.includes(permission as WorkspacePermission))) { rejectTask(planned, "AGENT_NOT_ALLOWED"); continue; }
        const budget = Math.max(0, Math.min(maximumSpecialistCalls, MAX_PROVIDER_CALLS - 1));
        if (trace.providerCalls >= budget) { rejectTask(planned, "AGENT_PROVIDER_CALL_LIMIT_EXCEEDED"); continue; }
        const task: AgentTask = { ...planned, workspaceId: baseContext.workspace.id, businessId: baseContext.business.id, input: baseContext.userRequest, constraints: ["read-only", "no tools", "no recursive agents", "no external actions"], approvalPolicy: "never", context: { ...baseContext, upstreamResults: dependencies.filter((item) => item.status === "completed") } };
        const lifecycle = new SpecialistTaskLifecycle(task.taskId, task.agentId, task.taskType); const taskStarted = Date.now(); this.lifecycleLog("orchestration.task.created", requestId, task, 0); lifecycle.start();
        const attempts: SpecialistAttempt[] = []; let finalResult: AgentResult | undefined; let finalProviderStatus: ProviderExecutionStatus = "not_started"; let stopReason: SpecialistStopReason = "internal_error"; let validationStatus: "valid" | "failed" = "failed"; let taskCalls = 0;
        const maxAttempts = Math.max(1, Math.min(definition.maxProviderCalls, 2));
        for (let attempt = 1; attempt <= maxAttempts && trace.providerCalls < budget; attempt += 1) {
          const attemptStarted = Date.now(); const startedAt = new Date().toISOString();
          this.lifecycleLog("orchestration.task.started", requestId, task, attempt);
          try {
            const callsRemaining = Math.min(definition.maxProviderCalls - taskCalls, budget - trace.providerCalls);
            const execution = await new ProviderSpecialistWorker(definition, this.provider, task.agentId === "research" ? this.researchSource : undefined).execute(task, requestId, callsRemaining);
            trace.providerCalls += execution.providerCalls; taskCalls += execution.providerCalls; for (const key of ["inputTokens", "outputTokens", "totalTokens"] as const) trace.usage[key] += execution.usage[key];
            const validated = this.validator.validate(task, execution.result); finalResult = validated; validationStatus = validated.status === "failed" ? "failed" : execution.validationStatus; finalProviderStatus = execution.providerCalls ? "completed" : "not_started"; stopReason = validated.status === "completed" ? "completed" : validated.status === "needs_input" ? "needs_input" : "invalid_output";
            attempts.push({ attempt, providerStatus: finalProviderStatus, startedAt, finishedAt: new Date().toISOString(), durationMs: Date.now() - attemptStarted, ...(validated.error?.code ? { errorCode: validated.error.code } : {}) });
            break;
          } catch (caught) {
            const code = errorCode(caught); finalProviderStatus = providerState(code); stopReason = code === "AI_PROVIDER_TIMEOUT" ? "timeout" : code === "TASK_CANCELLED" ? "cancelled" : code === "INTERNAL_ORCHESTRATION_ERROR" ? "internal_error" : "provider_error";
            attempts.push({ attempt, providerStatus: finalProviderStatus, startedAt, finishedAt: new Date().toISOString(), durationMs: Date.now() - attemptStarted, errorCode: code }); trace.providerCalls += 1; taskCalls += 1;
            if (transientProviderError(code) && attempt < maxAttempts && trace.providerCalls < budget) { this.lifecycleLog("orchestration.task.retrying", requestId, task, attempt, code); continue; }
            const resultCode = code === "AI_PROVIDER_TIMEOUT" ? "PROVIDER_TIMEOUT" : code === "TASK_CANCELLED" ? "TASK_CANCELLED" : code === "INTERNAL_ORCHESTRATION_ERROR" ? code : "PROVIDER_ERROR";
            finalResult = this.failure(task.taskId, task.agentId, resultCode, transientProviderError(code)); if (resultCode === "PROVIDER_TIMEOUT") finalResult.status = "timed_out"; if (resultCode === "TASK_CANCELLED") finalResult.status = "cancelled";
            break;
          }
        }
        finalResult ??= this.failure(task.taskId, task.agentId, "INTERNAL_ORCHESTRATION_ERROR"); results.push(finalResult);
        const durationMs = Date.now() - taskStarted; const settlement = lifecycle.settle({ result: finalResult, providerStatus: finalProviderStatus, stopReason, attempts, durationMs }); settlements.push(settlement);
        const event = settlement.taskStatus === "completed" ? "orchestration.task.completed" : settlement.taskStatus === "timed_out" ? "orchestration.task.timed_out" : settlement.taskStatus === "cancelled" ? "orchestration.task.cancelled" : "orchestration.task.failed"; this.lifecycleLog(event, requestId, task, attempts.length, finalResult.error?.code, durationMs);
        trace.tasks.push({ taskId: task.taskId, agentId: task.agentId, taskType: task.taskType, status: finalResult.status, providerStatus: finalProviderStatus, stopReason, attempt: attempts.length, createdAt: lifecycle.createdAt, startedAt: attempts[0]?.startedAt, finishedAt: new Date().toISOString(), durationMs, providerCalls: taskCalls, tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, validationStatus, ...(finalResult.validationIssues?.length ? { validationIssues: finalResult.validationIssues } : {}), attempts });
      }
      if (!progressed) { for (const item of pending.splice(0)) rejectTask(item, "AGENT_DEPENDENCY_INVALID"); }
    }
    trace.durationMs = Date.now() - started;
    logAiOperation({ requestId, channel: "private", operation: "orchestration", authenticated: true, workspaceId: baseContext.workspace.id, businessId: baseContext.business.id, success: results.some((item) => item.status === "completed"), plannerOutcome: plan.tasks.map((item) => item.agentId), agentStatuses: trace.tasks.map(({ agentId, status }) => ({ agentId, status })), specialistTasks: plan.tasks.length, providerCalls: trace.providerCalls, usage: trace.usage, durationMs: trace.durationMs });
    const finalStatus = results.length === 0 || results.every((item) => item.status === "completed") ? "completed" : results.every((item) => item.status === "needs_input") ? "needs_input" : results.some((item) => item.status === "completed") ? "partial" : "failed";
    return { results, settlements, trace, finalStatus } as const;
  }

  private lifecycleLog(event: string, requestId: string | undefined, task: AgentTask, attempt: number, errorCode?: string, durationMs?: number) { logAiOperation({ event, requestId, operation: "orchestration", channel: "private", authenticated: true, workspaceId: task.workspaceId, businessId: task.businessId, taskId: task.taskId, specialistId: task.agentId, taskType: task.taskType, attempt, providerCapability: this.registry.get(task.agentId)?.providerRequirements[0], durationMs, errorCode, success: event.endsWith("completed") }); }
  private failure(taskId: string, agentId: AgentId, code: string, retryable = false): AgentResult { return { taskId, agentId, status: "failed", summary: "The specialist task could not be completed safely.", error: { code, message: code, retryable } }; }
}
