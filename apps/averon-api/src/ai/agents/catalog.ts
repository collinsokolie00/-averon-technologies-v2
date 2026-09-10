import type { AgentCatalogItem, AgentCatalogResponse, WorkspacePermission } from "@averon/shared-types";
import type { AuthContext } from "../../services/auth/authentication.ts";
import type { WorkspaceAuthorizationService } from "../../domains/workspaces/workspace.service.ts";
import { DefaultAgentRegistry } from "./registry.ts";
import { SkillRegistry } from "./skills.ts";
import { AgentReadinessEngine } from "./readiness.ts";

const identities: Record<string, { displayName: string; displayRole: string }> = {
  guardian: { displayName: "Guardian", displayRole: "Website Reliability & Repair Specialist" },
  research: { displayName: "Atlas", displayRole: "Research Agent" }, seo: { displayName: "Mantis", displayRole: "SEO Agent" }, blog: { displayName: "Scribe", displayRole: "Writing Agent" }, analytics: { displayName: "Pulse", displayRole: "Analytics Agent" }, documentation: { displayName: "Archive", displayRole: "Documentation Agent" }, frontend: { displayName: "Canvas", displayRole: "Frontend Agent" }, backend: { displayName: "Forge", displayRole: "Backend Agent" }, database: { displayName: "Ledger", displayRole: "Database Agent" }, testing: { displayName: "Probe", displayRole: "QA Agent" }, security: { displayName: "Sentinel", displayRole: "Security Agent" }, "business-operations": { displayName: "Vector", displayRole: "Business Operations Agent" }, marketing: { displayName: "Nova", displayRole: "Marketing Agent" }, sales: { displayName: "Vantage", displayRole: "Sales Agent" }, "customer-operations": { displayName: "Relay", displayRole: "Customer Operations Agent" }, critic: { displayName: "Oracle", displayRole: "Critic / Verifier Agent" },
};
const restrictions = ["Cannot publish, delete, deploy, modify production, contact customers, perform database writes, or execute source actions directly.", "May only read, analyze, draft, and recommend inside the authorized workspace."];
export class AgentCatalogService {
  private readonly workspaces: WorkspaceAuthorizationService;
  private readonly agents = new DefaultAgentRegistry(); private readonly skills = new SkillRegistry();
  private readonly readiness = new AgentReadinessEngine(this.agents, this.skills, { availableProviders: ["ai.text_generation"], availableTools: [], availableModelCapabilities: ["structured_output"] });
  constructor(workspaces: WorkspaceAuthorizationService) { this.workspaces = workspaces; }
  async list(auth: AuthContext, workspaceId: string): Promise<AgentCatalogResponse> {
    const context = await this.workspaces.requirePermission(auth, workspaceId, "workspace:read");
    const items = this.agents.list().map((agent): AgentCatalogItem => { const evaluated = this.readiness.evaluate(agent); const missingPermission = agent.requiredPermissions.some((permission) => !context.permissions.includes(permission as WorkspacePermission)); const readiness = missingPermission ? "NOT_READY" as const : evaluated.status; return { id: agent.id, ...identities[agent.id]!, internalName: agent.name, description: agent.description, version: agent.version, readiness, readinessReasons: missingPermission ? ["Current workspace role cannot use Emmy specialists."] : evaluated.reasons, skills: agent.skills.map((id) => { const skill = this.skills.get(id)!; return { ...skill, requiredTools: [...(skill.requiredTools ?? [])] }; }), capabilities: [...agent.capabilities], allowedTaskTypes: [...agent.allowedTaskTypes], providerRequirements: [...agent.providerRequirements], modelCapabilities: [...agent.modelRequirements], executionRights: [...agent.executionRights], schemaVersion: agent.outputSchema, certification: { ...agent.certification }, businessOsAccess: agent.businessOsAccess, requiredPermissions: [...agent.requiredPermissions], riskLevel: agent.riskLevel, restrictions: [...restrictions] }; });
    return { workspace: { id: context.workspace.id, name: context.workspace.name }, items, summary: { specialists: items.length, ready: items.filter((item) => item.readiness === "READY").length, unavailable: items.filter((item) => item.readiness !== "READY").length, providerCapability: "ai.text_generation · structured_output" } };
  }
}
export { identities as agentDisplayIdentities };
