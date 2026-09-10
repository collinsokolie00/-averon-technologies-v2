export type EntityId = string;
export * from "./page-metadata.ts";
export * from "./page-content.ts";
export * from "./workspace-notifications.ts";
export * from "./workspace-tasks.ts";
export * from "./workspace-automations.ts";
export * from "./guardian-repairs.ts";
import type { GuardianRepairActionMetadata } from "./guardian-repairs.ts";
import type { SeoMetadataActionMetadata } from "./page-metadata.ts";

export interface UserIdentity {
  userId: EntityId;
  email?: string;
  displayName?: string;
}

export type TenancyStatus = "active" | "disabled";
export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type WorkspacePermission =
  | "workspace:read" | "workspace:manage" | "business:read"
  | "customers:read" | "customers:manage" | "quotes:read" | "quotes:manage"
  | "contracts:read" | "contracts:manage" | "payments:read"
  | "content:read" | "content:manage" | "source:read" | "source:propose" | "source:manage" | "emmy:use";
export interface FrontendSourceActionMetadata { actionId: string; actionType: "frontend.source.read" | "frontend.source.propose" | "frontend.source.apply" | "frontend.source.verify"; status: "proposed" | "approval_required" | "applying" | "verifying" | "completed" | "failed" | "rejected"; approvalStatus: "not_required" | "pending" | "approved" | "rejected"; verificationStatus: "pending" | "passed" | "failed"; rollbackStatus?: "not_required" | "completed" | "failed"; deploymentStatus?: "not_performed"; targetFiles: string[]; changedLines: number; insertions: number; deletions: number; summary?: string; diff?: string; warnings: string[] }
export interface BackendSourceActionMetadata { actionId: string; actionType: "backend.source.read" | "backend.source.propose" | "backend.source.apply" | "backend.source.verify"; status: "proposed" | "approval_required" | "applying" | "verifying" | "completed" | "failed" | "rejected"; approvalStatus: "pending" | "approved" | "rejected"; verificationStatus: "pending" | "passed" | "failed"; rollbackStatus?: "not_required" | "completed" | "failed"; deploymentStatus?: "not_performed"; targetFiles: string[]; symbols: string[]; risk: "low" | "medium" | "high"; changedLines: number; summary?: string; diff?: string; warnings: string[] }
export type EmmyActionMetadata = BlogDraftActionMetadata | SeoMetadataActionMetadata | import("./page-content.ts").PageContentActionMetadata | FrontendSourceActionMetadata | BackendSourceActionMetadata | GuardianRepairActionMetadata;
export type EmmyPresentationBlock =
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "code" | "diff"; content: string; language?: string }
  | { type: "file"; path: string; status: string; summary?: string };
export type BusinessOsPermission = "business-os:read" | "business-os:manage" | "business-os:restricted-read";

export interface Business { id: EntityId; name: string; slug: string; status: TenancyStatus }
export interface Workspace { id: EntityId; businessId: EntityId; name: string; slug: string; status: TenancyStatus; logoUrl?: string }
export interface WorkspaceMembership { id: EntityId; userId: EntityId; workspaceId: EntityId; businessId: EntityId; role: WorkspaceRole; status: TenancyStatus }
export interface WorkspaceSummary { workspace: Workspace; business: Business; role: WorkspaceRole; permissions: WorkspacePermission[] }
export interface WorkspaceContext extends WorkspaceSummary { userId: EntityId; membershipId: EntityId }
export interface WorkspaceListResponse { items: WorkspaceSummary[] }

export interface EmmyConversation { id: EntityId; userId: EntityId; workspaceId: EntityId | null; title: string; status: "active"; createdAt?: unknown; updatedAt?: unknown }
export interface EmmyConversationMessage { id: EntityId; conversationId: EntityId; role: "user" | "assistant"; content: string; citations?: BusinessOsCitation[]; action?: EmmyActionMetadata; presentation?: EmmyPresentationBlock[]; generationStatus?: "processing" | "completed" | "interrupted"; createdAt?: unknown }
export interface BlogDraft { id: EntityId; workspaceId: EntityId; businessId: EntityId; title: string; slug: string; excerpt: string; body: string; seoTitle?: string; metaDescription?: string; tags?: string[]; status: "draft"; published: false; createdBy: EntityId; updatedBy: EntityId; createdAt: string; updatedAt: string }
export interface BlogDraftActionMetadata { actionId: string; actionType: "blog.draft.create" | "blog.draft.read" | "blog.draft.update"; status: "requested" | "authorized" | "executing" | "completed" | "failed" | "cancelled"; verificationStatus: "pending" | "passed" | "failed"; draftId?: string; specialists: Array<{ id: string; status: string }>; warnings: string[] }
export type EmmyStreamEvent =
  | { type: "started"; requestId: string; conversationId: string; workspaceId: string | null }
  | { type: "delta"; requestId: string; conversationId: string; content: string }
  | { type: "action_status"; requestId: string; conversationId: string; action: EmmyActionMetadata; assistantMessage: EmmyConversationMessage }
  | { type: "completed"; requestId: string; conversationId: string; reply: string; assistantMessage: EmmyConversationMessage; workspace?: { id: string; name: string }; businessOsStatus?: "ready" | "empty" | "uninitialized"; finalStatus?: AiOrchestrationStatus; citations?: BusinessOsCitation[]; action?: EmmyActionMetadata }
  | { type: "interrupted"; requestId: string; conversationId: string; code: string; message: string };

export type BusinessOsVisibility = "public" | "internal" | "restricted";
export type BusinessOsStatus = "active" | "archived";
export type BusinessOsSectionType = "profile" | "brand" | "services" | "pricing" | "policies" | "marketing" | "sales" | "seo" | "operations" | "sop" | "decisions" | "roadmap" | "instructions";
export type BusinessOsScalar = string | number | boolean | null;
export type BusinessOsValue = BusinessOsScalar | BusinessOsScalar[] | { [key: string]: BusinessOsScalar | BusinessOsScalar[] };
export interface BusinessOsContent { summary?: string; fields: Record<string, BusinessOsValue> }
export interface BusinessOs { workspaceId: string; businessId: string; status: BusinessOsStatus; schemaVersion: number }
export interface BusinessOsSection { id: EntityId; workspaceId: EntityId; businessId: EntityId; type: BusinessOsSectionType; title: string; content: BusinessOsContent; visibility: BusinessOsVisibility; status: BusinessOsStatus; version: number; updatedBy: EntityId; createdAt?: unknown; updatedAt?: unknown }
export interface BusinessOsCitation { citationId?: string; sectionType: BusinessOsSectionType | "external"; label: string; version?: number; url?: string }
export interface GroundedClaim { text: string; sourceRefs: string[]; grounding: "business_os" | "general" | "worker_result" }
export type AiOrchestrationStatus = "completed" | "partial" | "needs_input" | "failed";
export type OperationLifecycleStatus = "awaiting_approval" | "applying" | "verifying" | "completed" | "rejected" | "failed" | "rolled_back" | "no_change_required";
export interface OperationLifecycleTransition { status: OperationLifecycleStatus; occurredAt: string; requestId: string }
export interface OutputValidationIssue { specialist: string; stage: "json_parse" | "schema" | "safety" | "synthesis"; path: string; code: string; repairable: boolean }
export interface AiDiagnosticTask { taskId: string; agentId: string; status: string; durationMs: number; providerCalls: number; tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number }; validationStatus: "valid" | "failed"; validationIssues?: OutputValidationIssue[] }
export interface AiDiagnosticSynthesisAttempt { attempt: number; validationStatus: "valid" | "failed"; validationIssues: OutputValidationIssue[] }
export interface AiRequestDecisionDiagnostic { kind: "ADVISORY" | "READ_ONLY" | "MUTATION_REQUEST" | "APPROVAL_RESPONSE" | "CLARIFICATION_REQUIRED" | "UNSUPPORTED"; target?: string; requestedOutcome: string; mutationIntent: boolean; prohibitedMutations: string[]; approvalRequired: boolean; selectedCapability?: string; confidence: "high" | "medium" | "low"; reasonCodes: string[] }
export interface AiDiagnostic { requestId: string; workspaceId: string; businessId: string; startedAt: string; durationMs: number; finalStatus: AiOrchestrationStatus; plan: { taskCount: number; agentIds: string[] }; tasks: AiDiagnosticTask[]; citations: BusinessOsCitation[]; groundedClaimCount?: number; unsupportedClaimCount?: number; attributionValidation?: "valid" | "failed"; synthesisValidationIssues?: OutputValidationIssue[]; synthesisAttempts?: AiDiagnosticSynthesisAttempt[]; requestedSkills?: string[]; candidateCount?: number; selectedAgentIds?: string[]; readinessFailures?: string[]; skillCoverage?: Record<string, string>; unresolvedSkills?: string[]; selectedTeamSize?: number; dependencies?: Record<string, string[]>; verificationRequirement?: string; verifierStatus?: string; tasksCompleted?: number; tasksFailed?: number; verifierInterventions?: number; needsInputCount?: number; contradictionCount?: number; criticInvoked?: boolean; partialFailureCount?: number; budgetStatus?: "within_budget" | "exceeded"; safeSynthesis?: boolean; errorCodes: string[]; providerCalls: number; tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number } }
export interface AiDiagnostic { operationStatus?: OperationLifecycleStatus; operationAction?: string; operationId?: string; operationRequestIds?: string[]; operationTransitions?: OperationLifecycleTransition[]; diagnosticUpdatedAt?: string; taskId?: string }
export interface AiDiagnostic { requestDecision?: AiRequestDecisionDiagnostic; guardianExecution?: { websiteId: string; reportId: string; findingIds: string[]; checks: Array<{ kind: GuardianCheckKind; status: GuardianCheckStatus; target?: string; errorCode?: string }> } }
export interface AgentCatalogSkill { id: string; name: string; domain: string; description: string; riskLevel: "low" | "moderate" | "high" | "critical"; requiredPermissions: string[]; requiredTools: string[] }
export interface AgentCatalogItem { id: string; displayName: string; displayRole: string; internalName: string; description: string; version: string; readiness: "READY" | "DEGRADED" | "NOT_READY" | "DISABLED" | "EXPERIMENTAL"; readinessReasons: string[]; skills: AgentCatalogSkill[]; capabilities: string[]; allowedTaskTypes: string[]; providerRequirements: string[]; modelCapabilities: string[]; executionRights: string[]; schemaVersion: string; certification: { lastEvalStatus: string; certificationStatus: string; certifiedSchemaVersion?: string }; businessOsAccess: "none" | "public" | "internal" | "restricted"; requiredPermissions: string[]; riskLevel: "low" | "moderate" | "high" | "critical"; restrictions: string[] }
export interface AgentCatalogResponse { workspace: { id: string; name: string }; items: AgentCatalogItem[]; summary: { specialists: number; ready: number; unavailable: number; providerCapability: string } }
export type PermissionControlState = "automatic" | "requires_approval" | "blocked";
export interface PermissionControlEntry { id: string; label: string; state: PermissionControlState; reasonCode?: string; explanation: string; requiredPermission?: WorkspacePermission; approvalRequired: boolean }
export interface PermissionControlSkill extends PermissionControlEntry { domain: string; riskLevel: "low" | "moderate" | "high" | "critical"; requiredTools: string[]; eligibleAgentIds: string[] }
export interface PermissionControlAction extends PermissionControlEntry { requiredSkill?: string; agentId?: string; serverControlled: true }
export interface AgentPermissionProjection { id: string; displayName: string; displayRole: string; readiness: AgentCatalogItem["readiness"]; specialistAuthority: PermissionControlEntry[]; skills: PermissionControlSkill[]; relatedActions: PermissionControlAction[] }
export interface WorkspacePermissionProjection { workspace: { id: string; name: string }; role: WorkspaceRole; agents: AgentPermissionProjection[]; actions: PermissionControlAction[]; boundaries: PermissionControlEntry[] }
export type WorkspaceRunStatus = OperationLifecycleStatus | AiOrchestrationStatus;
export interface WorkspaceRunSpecialist { id: string; displayName: string; displayRole: string; status: string; skills: string[]; providerCalls: number; validationStatus: "valid" | "failed"; durationMs: number }
export interface WorkspaceRunTraceStage { kind: "request" | "planner" | "specialist" | "skill" | "action" | "lifecycle" | "completion"; label: string; status?: string; occurredAt?: string }
export interface WorkspaceRunSummary { operationId: string; requestId: string; title: string; workspace: { id: string; name: string }; status: WorkspaceRunStatus; startedAt: string; updatedAt: string; durationMs: number; specialistIds: string[]; specialists: Array<{ id: string; displayName: string; displayRole: string }>; actionType?: string; taskId?: string; errorCodes: string[] }
export interface WorkspaceRunDetail extends WorkspaceRunSummary { requestIds: string[]; requestedSkills: string[]; skillCoverage: Record<string, string>; specialistDetails: WorkspaceRunSpecialist[]; providerCalls: number; validationStatus: "valid" | "failed"; criticInvoked: boolean; criticVerdict?: string; tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number }; grounding: { citationCount: number; groundedClaimCount?: number; unsupportedClaimCount?: number }; actionTransitions: OperationLifecycleTransition[]; trace: WorkspaceRunTraceStage[] }
export interface WorkspaceRunsResponse { workspace: { id: string; name: string }; items: WorkspaceRunSummary[] }
export type BusinessDecisionStatus = "proposed" | "active" | "superseded" | "archived";
export interface BusinessDecision { id: EntityId; workspaceId: EntityId; businessId: EntityId; title: string; summary: string; rationale?: string; status: BusinessDecisionStatus; effectiveDate?: string; supersedes?: EntityId; supersededBy?: EntityId; version: number; createdBy: EntityId; updatedBy: EntityId; createdAt?: unknown; updatedAt?: unknown }
export interface BusinessOsHistoryItem { id: string; workspaceId: string; eventType: "BUSINESS_OS_SECTION_CREATED" | "BUSINESS_OS_SECTION_UPDATED" | "BUSINESS_DECISION_CREATED" | "BUSINESS_DECISION_UPDATED"; targetType: "section" | "decision"; targetId: string; version?: number; actorId?: string; occurredAt?: unknown }

export interface BusinessIdentity { businessId: EntityId; name?: string }
export interface WorkspaceIdentity { workspaceId: EntityId; businessId: EntityId; name?: string }

export type Role = "user" | "workspace-member" | "workspace-admin" | "admin";

export type Permission =
  | "workspace:read"
  | "workspace:manage"
  | "emmy:message"
  | "agent:approve"
  | "admin:access";

export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorDetail;
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface SafeSession {
  userId: string;
  email?: string;
  displayName?: string;
  role: "user" | "admin" | "owner";
  isAdmin: boolean;
}

export interface AdminSession extends SafeSession {
  permissions: string[];
}

export type PaymentStatus = "pending" | "paid" | "failed" | "expired";
export interface PaymentCheckoutRequest { invoiceId: string }
export interface PaymentCheckoutResponse { checkoutUrl: string; checkoutReference: string; reused: boolean }
export interface PaymentSummary { status: PaymentStatus; contractId?: string; projectReference?: string }

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
}

export interface ActivityRecord {
  activityId: EntityId;
  workspaceId: EntityId;
  actorId?: EntityId;
  type: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationRecord {
  notificationId: EntityId;
  userId: EntityId;
  workspaceId?: EntityId;
  title: string;
  body?: string;
  readAt?: string;
  createdAt: string;
}

export type GuardianCheckKind = "AVAILABILITY" | "ROUTES" | "ASSETS" | "LINKS" | "UI_SMOKE" | "RUNTIME" | "FORMS" | "API_HEALTH" | "RESPONSIVE";
export type GuardianCheckStatus = "PASS" | "FAIL" | "NOT_CHECKED";
export type GuardianSeverity = "MINOR" | "MODERATE" | "MAJOR" | "CRITICAL";
export type GuardianHealthStatus = "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "CRITICAL" | "CONFIGURATION_REQUIRED";
export interface GuardianWebsite { id: string; workspaceId: string; name: string; baseUrl?: string; enabled: boolean; environment: string; healthEndpoint?: string; importantRoutes: string[]; checks: GuardianCheckKind[]; lastCheckedAt?: string; createdAt: string; updatedAt: string }
export interface GuardianCheckResult { kind: GuardianCheckKind; status: GuardianCheckStatus; target?: string; summary: string; evidence?: { statusCode?: number; signature?: string; viewport?: "desktop" | "mobile"; route?: string }; reason?: string }
export interface GuardianFinding { findingId: string; fingerprint: string; workspaceId: string; websiteId: string; runId: string; linkedRunIds: string[]; maintenanceTaskId?: string; detectedAt: string; lastSeenAt: string; occurrenceCount: number; category: GuardianCheckKind; severity: GuardianSeverity; title: string; description: string; evidence: string[]; affectedUrl?: string; status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED"; recommendedAction: string; repairComplexity: "LOW" | "MEDIUM" | "HIGH"; recommendedSpecialists: string[]; observedInLatestRun: boolean; resolvedAt?: string; resolvedByRepairPlanId?: string; verifiedRunId?: string }
export interface GuardianHealthReport { reportId: string; workspaceId: string; websiteId: string; runId: string; checkedAt: string; status: GuardianHealthStatus; checks: GuardianCheckResult[]; findingIds: string[]; recommendedActions: string[]; sourceChangesPerformed: false }
