export type AgentId = string;
export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type ExecutionRight = "read" | "analyze" | "draft" | "recommend" | "prepare_action" | "execute_reversible" | "execute_sensitive";
export type CostClass = "low" | "medium" | "high";
export type VerificationRequirement = "none" | "validator_only" | "independent_critic" | "specialist_verifier" | "human_approval";
export type ReadinessStatus = "READY" | "DEGRADED" | "NOT_READY" | "DISABLED" | "EXPERIMENTAL";
export type CertificationStatus = "untested" | "passed" | "failed" | "stale";
export type ModelCapability = "reasoning" | "structured_output" | "long_context" | "coding" | "vision";

export interface SkillDefinition { id: string; name: string; domain: string; description: string; riskLevel: RiskLevel; requiredPermissions: string[]; requiredTools?: string[] }
export interface AgentCertification { lastEvalStatus: CertificationStatus; certifiedSchemaVersion?: string; certificationStatus: CertificationStatus }

export type AgentExecutionStatus = "pending" | "running" | "completed" | "failed" | "needs_input" | "timed_out" | "cancelled";
export type OrchestrationTaskStatus = "pending" | "running" | "completed" | "failed" | "timed_out" | "cancelled";
export type ProviderExecutionStatus = "not_started" | "completed" | "failed" | "timed_out" | "cancelled";
export type SpecialistStopReason = "completed" | "provider_error" | "timeout" | "invalid_output" | "cancelled" | "internal_error" | "needs_input";
export type ApprovalPolicy = "never" | "before-execution" | "before-external-action" | "always";
export type ActionType = "blog.draft.create" | "blog.draft.read" | "blog.draft.update";
export type ActionStatus = "requested" | "authorized" | "executing" | "completed" | "failed" | "cancelled";
export interface ActionRequest<T = unknown> { actionId: string; workspaceId: string; requestedBy: string; actionType: ActionType; target?: { draftId?: string }; payload: T; riskLevel: RiskLevel; approvalRequirement: "explicit-current-request" | "confirmation-required"; createdAt: string }
export interface ActionSettlement<T = unknown> { actionId: string; status: ActionStatus; result?: T; error?: { code: string; message: string }; verification: { status: "pending" | "passed" | "failed"; checks: string[] }; startedAt?: string; finishedAt?: string }

export interface AgentCapability {
  capabilityId: string;
  description: string;
  requiresApproval: boolean;
}

export interface AgentDefinition {
  agentId: AgentId;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  defaultApprovalPolicy: ApprovalPolicy;
  allowedTaskTypes: string[];
  requiredPermissions: string[];
  access: "read-only" | "read-write";
  provider: string;
  model?: string;
  maximumExecutionMs: number;
  outputSchema: string;
  enabled: boolean;
}

export interface AgentSpec {
  id: AgentId; name: string; domain: string; description: string; version: string;
  skills: string[]; capabilities: string[]; allowedTaskTypes: string[];
  providerRequirements: string[]; modelRequirements: ModelCapability[]; toolRequirements: string[];
  requiredPermissions: string[]; businessOsAccess: "none" | "public" | "internal" | "restricted";
  riskLevel: RiskLevel; executionMode: "provider" | "deterministic"; executionRights: ExecutionRight[];
  costClass: CostClass; maxProviderCalls: number; maxRuntimeMs: number;
  inputSchema: string; outputSchema: string; verificationRequirements: VerificationRequirement[];
  enabled: boolean; experimental: boolean; readinessRequirements: string[]; certification: AgentCertification;
}

export interface CapabilityPlan { directAnswerPossible: boolean; requiredSkills: string[]; optionalSkills: string[]; requestedContextSections: string[] }
export interface ReadinessResult { agentId: AgentId; status: ReadinessStatus; reasons: string[]; availableSkills: string[]; missingRequirements: string[] }
export interface SkillReadinessResult { skillId: string; executable: boolean; status: ReadinessStatus; eligibleAgentIds: AgentId[]; reasons: string[]; missingRequirements: string[] }
export interface TeamSelectionResult { requiredSkills: string[]; selectedAgents: AgentId[]; skillCoverage: Record<string, AgentId>; unresolvedSkills: string[]; readinessWarnings: string[]; expectedRisk: RiskLevel; expectedProviderCalls: number; candidateCount: number }
export interface TeamBudget { maxAgents: number; maxProviderCalls: number; maxRuntimeMs: number; costClassCeiling?: CostClass }

export interface AgentContext {
  workspace: { id: string; name: string };
  business: { id: string; name: string };
  sections: unknown[];
  upstreamResults: AgentResult[];
  userRequest: string;
}

export interface AgentTask {
  taskId: string;
  workspaceId: string;
  businessId: string;
  agentId: AgentId;
  taskType: string;
  objective: string;
  input: unknown;
  constraints: string[];
  approvalPolicy: ApprovalPolicy;
  context: AgentContext;
  expectedOutput: string;
}

export interface SpecialistAttempt {
  attempt: number;
  providerStatus: ProviderExecutionStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  errorCode?: string;
}

export interface SpecialistSettlement<T = unknown> {
  taskId: string;
  specialistId: AgentId;
  taskType: string;
  specialistStatus: "available" | "unavailable";
  taskStatus: Exclude<OrchestrationTaskStatus, "pending" | "running">;
  providerStatus: ProviderExecutionStatus;
  stopReason: SpecialistStopReason;
  attempt: number;
  durationMs: number;
  output?: T;
  error?: AgentError;
  attempts: SpecialistAttempt[];
}

export interface AgentError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface OutputValidationIssue {
  specialist: string;
  stage: "json_parse" | "schema" | "safety" | "synthesis";
  path: string;
  code: string;
  repairable: boolean;
}

export interface AgentResult {
  taskId: string;
  agentId: AgentId;
  schemaVersion?: string;
  status: AgentExecutionStatus;
  summary?: string;
  output?: unknown;
  warnings?: string[];
  approvalRequired?: boolean;
  error?: AgentError;
  missingInformation?: string[];
  sourceRefs?: string[];
  validationIssues?: OutputValidationIssue[];
}

export interface PlannedTask {
  taskId: string;
  agentId: AgentId;
  taskType: string;
  objective: string;
  dependencies: string[];
  dependencyPolicy: "required" | "optional";
  requiredContextSections: string[];
  expectedOutput: string;
}

export interface TaskPlan { directAnswerPossible: boolean; tasks: PlannedTask[]; teamSelection?: TeamSelectionResult }

export interface AgentRegistry {
  get(agentId: AgentId): AgentSpec | undefined;
  list(): readonly AgentSpec[];
}

export interface WorkspaceContext {
  workspaceId: string;
  businessId: string;
  userId: string;
  permissions: string[];
}

export interface IncomingEmmyRequest {
  requestId: string;
  message: string;
  context: WorkspaceContext;
  conversationId?: string;
}

export interface IntentClassification {
  intent: string;
  confidence?: number;
  clarificationRequired: boolean;
}

export interface EmmyTaskPlan {
  planId: string;
  intent: IntentClassification;
  tasks: AgentTask[];
}

export interface ApprovalRequest {
  approvalId: string;
  taskId: string;
  reason: string;
  requestedAt: string;
}

export interface FinalEmmyResponse {
  requestId: string;
  message: string;
  taskResults: AgentResult[];
  approvalRequest?: ApprovalRequest;
}
