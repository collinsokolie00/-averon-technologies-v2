export type GuardianRepairPlanStatus = "DRAFT" | "AWAITING_APPROVAL" | "APPROVED" | "EXECUTING" | "VERIFYING" | "COMPLETED" | "FAILED" | "REJECTED" | "CANCELLED" | "ROLLBACK_REQUIRED" | "ROLLED_BACK";
export type GuardianRepairActionType = "frontend.source.apply" | "backend.source.apply" | "UNSUPPORTED";
export interface GuardianRepairTransition { status: GuardianRepairPlanStatus; occurredAt: string; actorId: string; requestId: string }
export type GuardianVerificationMethod = "source_readback" | "bounded_test" | "browser_check" | "endpoint_check";
export interface GuardianVerificationAssertion { assertionId: string; resource: string; targetType: "selector" | "component" | "source_range" | "route" | "api_route"; targetIdentifier: string; expectedState: string; verificationMethod: GuardianVerificationMethod }
export interface GuardianAssertionResult { assertionId: string; resource: string; observedState: string; verdict: "PASS" | "FAIL"; evidenceReference: string; verificationMethod: GuardianVerificationMethod }
export type GuardianRepairStepStatus = "PENDING" | "EXECUTING" | "VERIFYING" | "COMPLETED" | "FAILED";
export interface GuardianRepairStepInput { stepId: string; order: number; dependencies: string[]; authorizedActionId: string; actionType: Exclude<GuardianRepairActionType, "UNSUPPORTED"> }
export interface GuardianRepairStepSimulation { status: "PASSED" | "FAILED"; simulatedAt: string; compatibilityEvidence: string[] }
export type GuardianRepairAttemptOutcome = "RUNNING" | "SUCCEEDED" | "FAILED" | "BLOCKED";
export interface GuardianRepairStepAttempt {
  attemptId: string; planId: string; stepId: string; attemptNumber: 1 | 2;
  startedAt: string; completedAt?: string; outcome: GuardianRepairAttemptOutcome; failureCode?: string;
  approvedPlanDigest: string; evidenceRevision: string; sourceRevision: string;
  verificationResult?: "NOT_RUN" | "PASSED" | "FAILED";
}
export interface GuardianRepairStep extends GuardianRepairStepInput {
  target: string; expectedResources: string[]; verificationAssertions: GuardianVerificationAssertion[];
  simulation?: GuardianRepairStepSimulation; executionStatus: GuardianRepairStepStatus;
  verificationStatus: "pending" | "passed" | "failed"; executionRunId?: string; verificationRunId?: string; failureCode?: string;
  attempts?: GuardianRepairStepAttempt[];
}
export interface GuardianRepairPlan {
  repairPlanId: string; workspaceId: string; websiteId: string; findingId: string; reportId: string;
  maintenanceTaskId?: string; diagnosticsId: string; authorizedActionId?: string;
  repairRunId?: string; probeRunId?: string; rollbackRunId?: string;
  status: GuardianRepairPlanStatus; severity: "MINOR" | "MODERATE" | "MAJOR" | "CRITICAL";
  problemSummary: string; evidenceSummary: string; recommendedSpecialists: string[];
  recommendedActionType: GuardianRepairActionType; target: string; proposedOutcome: string;
  riskLevel: "low" | "medium" | "high"; requiresApproval: boolean; supported: boolean;
  expectedResources: string[]; verificationAssertions: GuardianVerificationAssertion[]; verificationPlan: string[]; rollbackPlan: string;
  verificationStatus: "pending" | "passed" | "failed"; rollbackStatus: "unsupported" | "available" | "not_required" | "completed" | "failed";
  version: number; transitions: GuardianRepairTransition[]; createdAt: string; updatedAt: string;
  approvedAt?: string; approvedBy?: string; executedAt?: string; verifiedAt?: string; closedAt?: string; verifiedRunId?: string;
  failureCode?: string;
  steps?: GuardianRepairStep[]; simulationStatus?: "NOT_RUN" | "PASSED" | "FAILED"; simulatedPlanDigest?: string;
  approvedPlanDigest?: string; simulatedVersion?: number; currentStepId?: string;
}
export interface GuardianRepairActionMetadata {
  actionId: string; actionType: "guardian.repair.plan"; status: "proposed" | "approval_required" | "executing" | "verifying" | "rollback_required" | "completed" | "failed" | "rejected";
  approvalStatus: "pending" | "approved" | "rejected"; verificationStatus: "pending" | "passed" | "failed";
  rollbackStatus?: "not_required" | "completed" | "failed"; deploymentStatus: "not_performed";
  websiteId: string; findingId: string; severity: GuardianRepairPlan["severity"]; target: string;
  specialists: string[]; expectedResources: string[]; risk: GuardianRepairPlan["riskLevel"];
  summary: string; evidenceSummary: string; proposedOutcome: string; verificationPlan: string[]; rollbackPlan: string; warnings: string[];
}
