export type GuardianRepairPlanStatus = "DRAFT" | "AWAITING_APPROVAL" | "APPROVED" | "EXECUTING" | "VERIFYING" | "COMPLETED" | "FAILED" | "REJECTED" | "CANCELLED" | "ROLLBACK_REQUIRED" | "ROLLBACK_FAILED" | "ROLLED_BACK";
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
export type GuardianSpecialistRecommendation = "PROCEED" | "PROCEED_WITH_WARNINGS" | "NEEDS_MORE_EVIDENCE" | "BLOCK";
export type GuardianSpecialistAssessmentStatus = "PROCEED" | "PROCEED_WITH_WARNINGS" | "NEEDS_MORE_EVIDENCE" | "BLOCKED";
export interface GuardianSpecialistContribution {
  contributionId: string; repairPlanId: string; workspaceId: string; planVersion: number;
  specialistId: string; specialistRunId?: string; advisoryRole: "DOMAIN_ANALYSIS" | "QUALITY_REVIEW" | "SECURITY_REVIEW" | "CRITICAL_REVIEW";
  evidenceReferences: string[]; recommendation: GuardianSpecialistRecommendation;
  assessment?: { confidence?: number; warnings?: string[] }; requiresPlanRevision?: boolean;
  validationStatus: "VALID" | "INVALID"; validationFailureCode?: string; createdAt: string;
}
export interface GuardianSpecialistAssessment {
  status: GuardianSpecialistAssessmentStatus; contributionIds: string[]; disagreements: string[];
  blockingConcerns: string[]; warnings: string[]; assessedAt: string; planVersion: number;
}
export interface GuardianRepairStep extends GuardianRepairStepInput {
  target: string; expectedResources: string[]; verificationAssertions: GuardianVerificationAssertion[];
  simulation?: GuardianRepairStepSimulation; executionStatus: GuardianRepairStepStatus;
  verificationStatus: "pending" | "passed" | "failed"; executionRunId?: string; verificationRunId?: string; failureCode?: string;
  attempts?: GuardianRepairStepAttempt[];
  rollbackSupported?: boolean; rollbackBaselineAssertions?: GuardianVerificationAssertion[]; mutationApplied?: boolean;
  rollbackState?: "INELIGIBLE" | "ELIGIBLE" | "VALIDATING" | "EXECUTING" | "VERIFYING" | "COMPLETED" | "FAILED";
}
export interface GuardianRepairRollbackStep {
  stepId: string; executionOrder: number; rollbackOrder: number; actionId: string;
  actionType: Exclude<GuardianRepairActionType, "UNSUPPORTED">; resources: string[];
  postRepairAssertions: GuardianVerificationAssertion[]; baselineAssertions: GuardianVerificationAssertion[];
  state: "PENDING" | "VALIDATING" | "EXECUTING" | "VERIFYING" | "COMPLETED" | "FAILED";
  attemptCount: 0 | 1; startedAt?: string; completedAt?: string; failureCode?: string;
  validationEvidence: string[]; executionEvidence: string[]; verificationEvidence: string[]; verificationPassed?: boolean;
}
export interface GuardianRepairRollbackAuditEvent { event: string; stepId?: string; occurredAt: string; code?: string }
export interface GuardianRepairRollbackCoordination {
  reason: string; initiatingFailedStepId?: string; originalFailureCode?: string; sequence: GuardianRepairRollbackStep[];
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "MANUAL_INTERVENTION_REQUIRED";
  startedAt: string; completedAt?: string; failedStepId?: string; failureCode?: string; auditEvents: GuardianRepairRollbackAuditEvent[];
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
  specialistContributions?: GuardianSpecialistContribution[]; specialistAssessment?: GuardianSpecialistAssessment;
  rollbackCoordination?: GuardianRepairRollbackCoordination;
}
export interface GuardianRepairActionMetadata {
  actionId: string; actionType: "guardian.repair.plan"; status: "proposed" | "approval_required" | "executing" | "verifying" | "rollback_required" | "completed" | "failed" | "rejected";
  approvalStatus: "pending" | "approved" | "rejected"; verificationStatus: "pending" | "passed" | "failed";
  rollbackStatus?: "not_required" | "completed" | "failed"; deploymentStatus: "not_performed";
  websiteId: string; findingId: string; severity: GuardianRepairPlan["severity"]; target: string;
  specialists: string[]; expectedResources: string[]; risk: GuardianRepairPlan["riskLevel"];
  summary: string; evidenceSummary: string; proposedOutcome: string; verificationPlan: string[]; rollbackPlan: string; warnings: string[];
}
