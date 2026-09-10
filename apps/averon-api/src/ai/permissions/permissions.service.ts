import type { AgentPermissionProjection, PermissionControlAction, PermissionControlEntry, PermissionControlSkill, WorkspacePermission, WorkspacePermissionProjection } from "@averon/shared-types";
import type { AuthContext } from "../../services/auth/authentication.ts";
import type { WorkspaceAuthorizationService } from "../../domains/workspaces/workspace.service.ts";
import { DefaultAgentRegistry } from "../agents/registry.ts";
import { SkillRegistry } from "../agents/skills.ts";
import { AgentReadinessEngine } from "../agents/readiness.ts";
import { agentDisplayIdentities } from "../agents/catalog.ts";
import { registeredActionPolicies } from "../actions/action-capabilities.ts";

const environment = { availableProviders: ["ai.text_generation"], availableTools: [] as string[], availableModelCapabilities: ["structured_output"] };
const boundary = (id: string, label: string, explanation: string): PermissionControlEntry => ({ id, label, state: "blocked", reasonCode: "CAPABILITY_NOT_REGISTERED", explanation, approvalRequired: false });

export class WorkspacePermissionProjectionService {
  private readonly workspaces: WorkspaceAuthorizationService;
  private readonly agents = new DefaultAgentRegistry();
  private readonly skills = new SkillRegistry();
  private readonly readiness = new AgentReadinessEngine(this.agents, this.skills, environment);
  constructor(workspaces: WorkspaceAuthorizationService) { this.workspaces = workspaces; }

  async get(auth: AuthContext, workspaceId: string): Promise<WorkspacePermissionProjection> {
    const context = await this.workspaces.requirePermission(auth, workspaceId, "workspace:read");
    const permissions = context.permissions;
    const actions = registeredActionPolicies.map((policy) => this.action(policy, permissions));
    const agents = this.agents.list().map((agent): AgentPermissionProjection => {
      const identity = agentDisplayIdentities[agent.id] ?? { displayName: agent.id, displayRole: "Specialist" };
      const evaluated = this.readiness.evaluate(agent);
      const authorized = agent.requiredPermissions.every((permission) => permissions.includes(permission as WorkspacePermission));
      const specialistState = evaluated.status === "READY" && authorized ? "automatic" as const : "blocked" as const;
      const specialistAuthority = [...agent.executionRights.map((right): PermissionControlEntry => ({ id: `specialist.${agent.id}.${right}`, label: right, state: specialistState, reasonCode: specialistState === "blocked" ? (authorized ? "AGENT_NOT_READY" : "WORKSPACE_PERMISSION_MISSING") : undefined, explanation: specialistState === "automatic" ? "Available for this specialist inside the authorized workspace." : authorized ? "The specialist is not currently production-ready." : "The current workspace role cannot use Emmy specialists.", requiredPermission: "emmy:use", approvalRequired: false })), boundary(`specialist.${agent.id}.mutate`, "Direct mutation", "Specialists do not execute Authorized Actions directly.")];
      const skills = agent.skills.map((skillId): PermissionControlSkill => { const skill = this.skills.get(skillId)!; const executable = specialistState === "automatic" && skill.requiredPermissions.every((permission) => permissions.includes(permission as WorkspacePermission)); return { id: skill.id, label: skill.name, domain: skill.domain, riskLevel: skill.riskLevel, requiredTools: [...(skill.requiredTools ?? [])], eligibleAgentIds: executable ? [agent.id] : [], state: executable ? "automatic" : "blocked", reasonCode: executable ? undefined : specialistState === "blocked" ? "AGENT_UNAVAILABLE" : "WORKSPACE_PERMISSION_MISSING", explanation: executable ? "A ready, authorized specialist can perform this analysis." : "No ready authorized specialist is available for this workspace role.", requiredPermission: skill.requiredPermissions[0] as WorkspacePermission | undefined, approvalRequired: false }; });
      return { id: agent.id, ...identity, readiness: authorized ? evaluated.status : "NOT_READY", specialistAuthority, skills, relatedActions: actions.filter((action) => action.agentId === agent.id) };
    });
    return { workspace: { id: context.workspace.id, name: context.workspace.name }, role: context.role, agents, actions, boundaries: [boundary("publish.website", "Publish website", "Publishing capability is not registered."), boundary("deploy.production", "Deploy production", "Deployment capability is not registered."), boundary("delete.production_data", "Delete production data", "Production deletion capability is not registered."), boundary("database.mutate", "Direct database mutation", "Direct database mutation is not registered for specialists."), boundary("customers.contact", "Contact customers directly", "Customer messaging execution is not registered.")] };
  }

  private action(policy: (typeof registeredActionPolicies)[number], permissions: WorkspacePermission[]): PermissionControlAction {
    const authorized = permissions.includes(policy.requiredPermission);
    const agent = policy.requiredSkill ? this.agents.listBySkill(policy.requiredSkill)[0] : undefined;
    const ready = !agent || this.readiness.evaluate(agent).status === "READY";
    const state = !authorized || !ready ? "blocked" : policy.approvalRequired ? "requires_approval" : "automatic";
    return { id: policy.actionType, label: policy.label, state, reasonCode: !authorized ? "WORKSPACE_PERMISSION_MISSING" : !ready ? "REQUIRED_SPECIALIST_NOT_READY" : undefined, explanation: !authorized ? `Requires ${policy.requiredPermission} in this workspace.` : !ready ? "The required specialist is not production-ready." : policy.approvalRequired ? "The existing source-action policy requires explicit approval before apply." : "The registered server action can run under current workspace authority.", requiredPermission: policy.requiredPermission, approvalRequired: policy.approvalRequired, ...(policy.requiredSkill ? { requiredSkill: policy.requiredSkill } : {}), ...(agent ? { agentId: agent.id } : {}), serverControlled: true };
  }
}
