import { randomUUID } from "node:crypto";
import type { WorkspaceAutomation } from "@averon/shared-types";
import { DefaultAgentRegistry } from "../../ai/agents/registry.ts";
import { agentDisplayIdentities } from "../../ai/agents/catalog.ts";
import { ApiError } from "../../errors/api-error.ts";
import type { AuthContext } from "../../services/auth/authentication.ts";
import type { WorkspaceAuthorizationService } from "../workspaces/workspace.service.ts";
import { nextOccurrence } from "./workspace-automation.schedule.ts";
import { parseAutomationCreate, parseAutomationUpdate } from "./workspace-automation.schemas.ts";
import type { WorkspaceAutomationRepository } from "./workspace-automation.types.ts";
export class WorkspaceAutomationService {
  private readonly agents = new DefaultAgentRegistry();
  private readonly repository: WorkspaceAutomationRepository; private readonly workspaces: WorkspaceAuthorizationService; private readonly now: () => Date;
  constructor(repository: WorkspaceAutomationRepository, workspaces: WorkspaceAuthorizationService, now: () => Date = () => new Date()) { this.repository = repository; this.workspaces = workspaces; this.now = now; }
  private validateAgents(ids: string[]) { for (const id of ids) if (!this.agents.get(id as never)) throw new ApiError(400, "AUTOMATION_AGENT_INVALID", `The assigned specialist ID ${id} is not registered.`); }
  async list(auth: AuthContext, workspaceId: string) { const context = await this.workspaces.requirePermission(auth, workspaceId, "workspace:read"); return { workspace: { id: context.workspace.id, name: context.workspace.name }, canManage: context.permissions.includes("workspace:manage"), items: await this.repository.list(workspaceId), agentIdentities: Object.fromEntries(this.agents.list().map((agent) => [agent.id, agentDisplayIdentities[agent.id]])) }; }
  async detail(auth: AuthContext, workspaceId: string, id: string) { await this.workspaces.requirePermission(auth, workspaceId, "workspace:read"); const item = await this.repository.get(workspaceId, id); if (!item) throw new ApiError(404, "AUTOMATION_NOT_FOUND", "The Automation was not found."); return { ...item, history: await this.repository.history(workspaceId, id) }; }
  private futureOccurrence(trigger: WorkspaceAutomation["trigger"]) { const occurrence = nextOccurrence(trigger, this.now()); if (!occurrence) throw new ApiError(400, "AUTOMATION_TRIGGER_EXPIRED", "An enabled Automation must have a future occurrence."); return occurrence; }
  async create(auth: AuthContext, workspaceId: string, body: unknown) { await this.workspaces.requirePermission(auth, workspaceId, "workspace:manage"); const input = parseAutomationCreate(body); this.validateAgents(input.operation.taskTemplate.assignedAgentIds); return this.repository.create({ id: randomUUID(), workspaceId, ...input, createdBy: auth.user.userId, updatedBy: auth.user.userId, linkedTaskIds: [], nextRunAt: input.enabled ? this.futureOccurrence(input.trigger) : null }); }
  async update(auth: AuthContext, workspaceId: string, id: string, body: unknown) { await this.workspaces.requirePermission(auth, workspaceId, "workspace:manage"); const { expectedVersion, patch } = parseAutomationUpdate(body); const current = await this.repository.get(workspaceId, id); if (!current) throw new ApiError(404, "AUTOMATION_NOT_FOUND", "The Automation was not found."); const operation = (patch.operation ?? current.operation) as WorkspaceAutomation["operation"]; this.validateAgents(operation.taskTemplate.assignedAgentIds); const trigger = (patch.trigger ?? current.trigger) as WorkspaceAutomation["trigger"]; const enabled = (patch.enabled ?? current.enabled) as boolean; const eventType = patch.enabled === false && current.enabled ? "automation.paused" : patch.enabled === true && !current.enabled ? "automation.resumed" : "automation.updated"; return this.repository.update(workspaceId, id, expectedVersion, { ...patch, nextRunAt: enabled ? this.futureOccurrence(trigger) : null } as Partial<WorkspaceAutomation>, auth.user.userId, eventType); }
}
