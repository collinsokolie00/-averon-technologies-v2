import type { AgentId, AgentResult, OrchestrationTaskStatus, ProviderExecutionStatus, SpecialistAttempt, SpecialistSettlement, SpecialistStopReason } from "@averon/agent-contracts";

export class SpecialistTaskLifecycle {
  readonly createdAt = new Date().toISOString();
  readonly taskId: string;
  readonly specialistId: AgentId;
  readonly taskType: string;
  private status: OrchestrationTaskStatus = "pending";
  private settlement?: SpecialistSettlement;

  constructor(taskId: string, specialistId: AgentId, taskType: string) { this.taskId = taskId; this.specialistId = specialistId; this.taskType = taskType; }

  start() {
    if (this.status !== "pending") return false;
    this.status = "running";
    return true;
  }

  settle(input: { result: AgentResult; providerStatus: ProviderExecutionStatus; stopReason: SpecialistStopReason; attempts: SpecialistAttempt[]; durationMs: number }): SpecialistSettlement {
    if (this.settlement) return this.settlement;
    const taskStatus = input.result.status === "completed" || input.result.status === "needs_input" ? "completed" : input.result.status === "timed_out" ? "timed_out" : input.result.status === "cancelled" ? "cancelled" : "failed";
    this.status = taskStatus;
    this.settlement = { taskId: this.taskId, specialistId: this.specialistId, taskType: this.taskType, specialistStatus: "available", taskStatus, providerStatus: input.providerStatus, stopReason: input.stopReason, attempt: input.attempts.length, durationMs: input.durationMs, ...(input.result.status === "completed" && input.result.output !== undefined ? { output: input.result.output } : {}), ...(input.result.error ? { error: input.result.error } : {}), attempts: input.attempts };
    return this.settlement;
  }

  currentStatus() { return this.status; }
}
