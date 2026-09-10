import type { AgentSpec, CostClass, ReadinessResult, RiskLevel, SkillReadinessResult, TeamBudget, TeamSelectionResult } from "@averon/agent-contracts";
import { DefaultAgentRegistry } from "./registry.ts";
import { SkillRegistry } from "./skills.ts";

export interface ReadinessEnvironment { availableProviders: string[]; availableTools: string[]; availableModelCapabilities: string[] }
const riskRank: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2, critical: 3 }; const costRank: Record<CostClass, number> = { low: 0, medium: 1, high: 2 };
export class AgentReadinessEngine {
  private readonly agents: DefaultAgentRegistry; private readonly skills: SkillRegistry; private readonly environment: ReadinessEnvironment;
  constructor(agents: DefaultAgentRegistry, skills: SkillRegistry, environment: ReadinessEnvironment) { this.agents = agents; this.skills = skills; this.environment = environment; }
  evaluate(agent: AgentSpec): ReadinessResult {
    if (!agent.enabled) return { agentId: agent.id, status: "DISABLED", reasons: ["Agent is disabled."], availableSkills: [], missingRequirements: ["enabled"] };
    const missing: string[] = [];
    for (const skill of agent.skills) if (!this.skills.isKnown(skill)) missing.push(`skill:${skill}`);
    for (const provider of agent.providerRequirements) if (!this.environment.availableProviders.includes(provider)) missing.push(`provider:${provider}`);
    for (const tool of agent.toolRequirements) if (!this.environment.availableTools.includes(tool)) missing.push(`tool:${tool}`);
    for (const capability of agent.modelRequirements) if (!this.environment.availableModelCapabilities.includes(capability)) missing.push(`model:${capability}`);
    if (!agent.outputSchema || agent.certification.certifiedSchemaVersion !== agent.outputSchema) missing.push("schema:certified");
    if (agent.certification.certificationStatus === "failed") missing.push("certification:failed");
    if (missing.length) return { agentId: agent.id, status: "NOT_READY", reasons: ["One or more readiness requirements are missing."], availableSkills: agent.skills.filter((id) => this.skills.isKnown(id)), missingRequirements: missing };
    if (agent.experimental) return { agentId: agent.id, status: "EXPERIMENTAL", reasons: ["Agent is experimental and is not eligible for production selection."], availableSkills: agent.skills, missingRequirements: [] };
    const degraded = agent.certification.certificationStatus === "stale" || agent.certification.certificationStatus === "untested";
    return { agentId: agent.id, status: degraded ? "DEGRADED" : "READY", reasons: degraded ? ["Agent certification is not current."] : [], availableSkills: agent.skills, missingRequirements: [] };
  }
  skill(skillId: string, permissions: string[], maximumRisk: RiskLevel = "moderate"): SkillReadinessResult {
    const skill = this.skills.get(skillId); if (!skill) return { skillId, executable: false, status: "NOT_READY", eligibleAgentIds: [], reasons: ["Skill is not registered."], missingRequirements: [`skill:${skillId}`] };
    const eligible = this.agents.listBySkill(skillId).filter((agent) => this.evaluate(agent).status === "READY" && agent.requiredPermissions.every((permission) => permissions.includes(permission)) && riskRank[agent.riskLevel] <= riskRank[maximumRisk]);
    return { skillId, executable: eligible.length > 0, status: eligible.length ? "READY" : "NOT_READY", eligibleAgentIds: eligible.map((agent) => agent.id), reasons: eligible.length ? [] : ["No ready authorized agent can execute this skill."], missingRequirements: eligible.length ? [] : ["eligible_agent"] };
  }
}

export class CapabilityResolver {
  private readonly agents: DefaultAgentRegistry; private readonly readiness: AgentReadinessEngine;
  constructor(agents: DefaultAgentRegistry, readiness: AgentReadinessEngine) { this.agents = agents; this.readiness = readiness; }
  resolveCandidates(input: { requiredSkills: string[]; optionalSkills?: string[]; permissions: string[]; riskLevel: RiskLevel }) {
    const skills = [...new Set([...input.requiredSkills, ...(input.optionalSkills ?? [])])]; const failures: ReadinessResult[] = [];
    const candidates = this.agents.listEnabled().filter((agent) => { const result = this.readiness.evaluate(agent); const authorized = agent.requiredPermissions.every((permission) => input.permissions.includes(permission)); const relevant = agent.skills.some((skill) => skills.includes(skill)); if (relevant && (result.status !== "READY" || !authorized || riskRank[agent.riskLevel] > riskRank[input.riskLevel])) failures.push(result.status === "READY" ? { ...result, status: "NOT_READY", reasons: [!authorized ? "Workspace permission denied." : "Risk policy denied."], missingRequirements: [!authorized ? "permission" : "risk"] } : result); return relevant && result.status === "READY" && authorized && riskRank[agent.riskLevel] <= riskRank[input.riskLevel]; });
    return { candidates, failures };
  }
}

export class SmallestTeamSelector {
  select(requiredSkills: string[], candidates: AgentSpec[], budget: TeamBudget): TeamSelectionResult {
    const unresolved = new Set(requiredSkills); const selected: AgentSpec[] = []; const coverage: Record<string, string> = {};
    while (unresolved.size && selected.length < budget.maxAgents) {
      const eligible = candidates.filter((agent) => !selected.includes(agent) && agent.maxProviderCalls <= budget.maxProviderCalls && agent.maxRuntimeMs <= budget.maxRuntimeMs && (!budget.costClassCeiling || costRank[agent.costClass] <= costRank[budget.costClassCeiling]));
      eligible.sort((a, b) => { const aCover = a.skills.filter((skill) => unresolved.has(skill)).length; const bCover = b.skills.filter((skill) => unresolved.has(skill)).length; return bCover - aCover || a.maxProviderCalls - b.maxProviderCalls || costRank[a.costClass] - costRank[b.costClass] || a.id.localeCompare(b.id); });
      const chosen = eligible[0]; if (!chosen || !chosen.skills.some((skill) => unresolved.has(skill))) break; selected.push(chosen); for (const skill of chosen.skills) if (unresolved.delete(skill)) coverage[skill] = chosen.id;
    }
    const expectedProviderCalls = selected.reduce((total, agent) => total + agent.maxProviderCalls, 0); if (expectedProviderCalls > budget.maxProviderCalls) { for (const skill of Object.keys(coverage)) delete coverage[skill]; unresolved.clear(); requiredSkills.forEach((skill) => unresolved.add(skill)); selected.length = 0; }
    const expectedRisk = selected.reduce<RiskLevel>((highest, agent) => riskRank[agent.riskLevel] > riskRank[highest] ? agent.riskLevel : highest, "low");
    return { requiredSkills, selectedAgents: selected.map((agent) => agent.id), skillCoverage: coverage, unresolvedSkills: [...unresolved], readinessWarnings: unresolved.size ? ["Some required skills are unresolved within readiness or budget limits."] : [], expectedRisk, expectedProviderCalls: selected.reduce((total, agent) => total + agent.maxProviderCalls, 0), candidateCount: candidates.length };
  }
}
