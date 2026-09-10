import { createHash } from "node:crypto";
import type { GuardianRepairPlan, GuardianRepairActionType, GuardianVerificationAssertion } from "@averon/shared-types";
import type { AuthContext } from "../../services/auth/authentication.ts";
import { ApiError } from "../../errors/api-error.ts";
import type { FrontendSourceActionService, SourceProposal } from "../frontend-source/frontend-source.actions.ts";
import type { BackendSourceActionService, BackendSourceProposal } from "../backend-source/backend-source.actions.ts";
import type { GuardianRepairCompatibilityContext, GuardianRepairExecutor, GuardianRepairExecutionResult } from "./guardian-repair.service.ts";

const assertionId = (actionId: string, resource: string, target: string) => `assert-${createHash("sha256").update(`${actionId}|${resource}|${target}`).digest("hex").slice(0, 20)}`;
const mismatch = () => new ApiError(409, "REPAIR_PROPOSAL_TARGET_MISMATCH", "The source proposal does not match the Guardian repair target.");
const explicitSelector = (context: GuardianRepairCompatibilityContext) => `${context.problemSummary} ${context.proposedOutcome}`.match(/\.[a-z][\w-]*/i)?.[0];
const targetRoute = (target: string) => { try { return new URL(target).pathname; } catch { return target.match(/\/[a-z][\w/-]*/i)?.[0]; } };
const frontendRouteMatches = (route: string | undefined, resource: string) => !route || (route === "/" ? /(?:^|\/)(?:Home|page)\.(?:tsx?|jsx?)$/i.test(resource) : resource.toLowerCase().includes(route.split("/").filter(Boolean).at(-1)?.toLowerCase() ?? "\0"));

function frontendCompatibility(actionId: string, proposal: SourceProposal, context: GuardianRepairCompatibilityContext) {
  if (!proposal.targets?.length) throw mismatch();
  const selector = explicitSelector(context); const route = targetRoute(context.target);
  const stateMatch = `${context.problemSummary} ${context.proposedOutcome}`.match(/([a-z][\w-]+)\s*(?:=|equals|to)\s*([\w.-]+)/i);
  const requestedState = stateMatch ? `${stateMatch[1]!.toLowerCase()}=${stateMatch[2]!.toLowerCase()}` : undefined;
  const compatible = proposal.targets.filter((target) => frontendRouteMatches(route, target.resource) && selector && target.targetType === "selector" && target.targetIdentifier === selector && requestedState && target.requestedState?.toLowerCase() === requestedState);
  if (!compatible.length) throw mismatch();
  const assertions: GuardianVerificationAssertion[] = compatible.map((target) => ({ assertionId: assertionId(actionId, target.resource, target.targetIdentifier), resource: target.resource, targetType: target.targetType, targetIdentifier: target.targetIdentifier, expectedState: target.expectedState, verificationMethod: "source_readback" }));
  return { assertions, evidence: compatible.map((target) => `${target.targetType}:${target.targetIdentifier}`) };
}

function backendCompatibility(actionId: string, proposal: BackendSourceProposal, context: GuardianRepairCompatibilityContext) {
  const route = targetRoute(context.target) ?? `${context.problemSummary} ${context.proposedOutcome}`.match(/\/[a-z][\w/-]*/i)?.[0];
  const files = proposal.files.filter((file) => route && file.symbol.toLowerCase().includes(route.toLowerCase()));
  const state = `${context.problemSummary} ${context.proposedOutcome}`.match(/\b(service|runtime)\s*(?:=|equals|to|:)\s*["“]?([\w.-]+)["”]?/i);
  const mutationMatches = Boolean(state && proposal.requestedMutations?.some((item) => item.field === state[1]!.toLowerCase() && item.value === state[2]));
  if (!route || !files.length || !mutationMatches) throw mismatch();
  const assertions: GuardianVerificationAssertion[] = files.map((file) => ({ assertionId: assertionId(actionId, file.path, file.symbol), resource: file.path, targetType: "api_route", targetIdentifier: file.symbol, expectedState: `sha256:${file.proposedHash}`, verificationMethod: "source_readback" }));
  return { assertions, evidence: files.map((file) => `api_route:${file.symbol}`) };
}

export class ExistingSourceGuardianRepairExecutor implements GuardianRepairExecutor {
  private readonly frontend: FrontendSourceActionService;
  private readonly backend: BackendSourceActionService;
  constructor(frontend: FrontendSourceActionService, backend: BackendSourceActionService) { this.frontend = frontend; this.backend = backend; }
  supports(action: GuardianRepairActionType, actionId?: string) { return Boolean(actionId) && (action === "frontend.source.apply" || action === "backend.source.apply"); }
  async resolve(auth: AuthContext, workspaceId: string, action: GuardianRepairActionType, actionId: string, context: GuardianRepairCompatibilityContext) {
    if (action === "frontend.source.apply") { const proposal = await this.frontend.resolveForGuardianRepair(auth, workspaceId, actionId); const match = frontendCompatibility(actionId, proposal, context); return { expectedResources: [...new Set(match.assertions.map((item) => item.resource))], verificationAssertions: match.assertions, rollbackSupported: true, compatibilityEvidence: match.evidence }; }
    if (action === "backend.source.apply") { const proposal = await this.backend.resolveForGuardianRepair(auth, workspaceId, actionId); const match = backendCompatibility(actionId, proposal, context); return { expectedResources: [...new Set(match.assertions.map((item) => item.resource))], verificationAssertions: match.assertions, rollbackSupported: true, compatibilityEvidence: match.evidence }; }
    throw mismatch();
  }
  async execute(auth: AuthContext, plan: GuardianRepairPlan): Promise<GuardianRepairExecutionResult> { const id = plan.authorizedActionId!; if (plan.recommendedActionType === "frontend.source.apply") { await this.frontend.approve(auth, plan.workspaceId, id); const result = await this.frontend.apply(auth, plan.workspaceId, id); const evidence = result.verification?.filter((item) => item.passed).map((item) => item.name) ?? []; return { actionId: id, status: result.status === "completed" ? "completed" : "failed", actionValidationPassed: result.status === "completed" && Boolean(result.verification?.every((item) => item.passed)), validationEvidence: evidence, rollbackSupported: true, rollbackStatus: result.rollbackStatus }; } if (plan.recommendedActionType === "backend.source.apply") { await this.backend.approve(auth, plan.workspaceId, id); const result = await this.backend.apply(auth, plan.workspaceId, id); const evidence = result.verification?.filter((item) => item.passed).map((item) => item.name) ?? []; return { actionId: id, status: result.status === "completed" ? "completed" : "failed", actionValidationPassed: result.status === "completed" && Boolean(result.verification?.every((item) => item.passed)), validationEvidence: evidence, rollbackSupported: true, rollbackStatus: result.rollbackStatus }; } return { actionId: id, status: "failed", actionValidationPassed: false, validationEvidence: [], rollbackSupported: false }; }
  async verify(auth: AuthContext, plan: GuardianRepairPlan) { const id = plan.authorizedActionId!; return plan.recommendedActionType === "frontend.source.apply" ? this.frontend.verifyForGuardianRepair(auth, plan.workspaceId, id, plan.verificationAssertions) : this.backend.verifyForGuardianRepair(auth, plan.workspaceId, id, plan.verificationAssertions); }
  async rollback(auth: AuthContext, plan: GuardianRepairPlan) { const id = plan.authorizedActionId!; const result = plan.recommendedActionType === "frontend.source.apply" ? await this.frontend.rollback(auth, plan.workspaceId, id) : await this.backend.rollback(auth, plan.workspaceId, id); const evidence = result.verification?.filter((item) => item.passed).map((item) => item.name) ?? []; return { passed: result.rollbackStatus === "completed" && Boolean(result.verification?.every((item) => item.passed)), evidence }; }
}
