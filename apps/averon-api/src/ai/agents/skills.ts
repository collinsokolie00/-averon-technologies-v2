import type { SkillDefinition } from "@averon/agent-contracts";
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value); const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
export function isValidSkillDefinition(value: unknown): value is SkillDefinition { if (!record(value)) return false; return [value.id, value.name, value.domain, value.description].every((item) => typeof item === "string" && item.length > 0) && ["low", "moderate", "high", "critical"].includes(String(value.riskLevel)) && strings(value.requiredPermissions) && (value.requiredTools === undefined || strings(value.requiredTools)); }

export const productionSkills = [
  { id: "research.internal_synthesis", name: "Internal research synthesis", domain: "research", description: "Synthesize authorized internal information and identify gaps.", riskLevel: "low", requiredPermissions: ["emmy:use"] },
  { id: "seo.content_strategy", name: "SEO content strategy", domain: "seo", description: "Develop source-bounded search intent and content strategy.", riskLevel: "low", requiredPermissions: ["emmy:use"] },
  { id: "seo.metadata", name: "SEO metadata", domain: "seo", description: "Draft titles and metadata without live ranking claims.", riskLevel: "low", requiredPermissions: ["emmy:use"] },
  { id: "content.blog_drafting", name: "Blog drafting", domain: "content", description: "Create unpublished content drafts.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
  { id: "analytics.interpretation", name: "Analytics interpretation", domain: "analytics", description: "Interpret supplied or authorized data without inventing metrics.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
  { id: "documentation.sop_drafting", name: "SOP drafting", domain: "documentation", description: "Draft structured internal documentation without writing files.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
  { id: "development.frontend_analysis", name: "Frontend analysis", domain: "development", description: "Analyze frontend architecture, React, accessibility, performance, and UI design.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
  { id: "development.backend_architecture", name: "Backend architecture", domain: "development", description: "Analyze APIs, server logic, authorization, integrations, and backend debugging.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
  { id: "development.backend_analysis", name: "Backend source analysis", domain: "development", description: "Analyze bounded backend source proposals without direct source access or execution.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
  { id: "database.schema_design", name: "Database design", domain: "database", description: "Analyze data models, queries, indexes, migrations, and integrity.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
  { id: "quality.test_strategy", name: "Test strategy", domain: "quality", description: "Draft tests, regression plans, acceptance criteria, and edge cases.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
  { id: "security.architecture_review", name: "Security review", domain: "security", description: "Review authorization, tenancy, API security, secrets, and data exposure.", riskLevel: "high", requiredPermissions: ["emmy:use"] },
  { id: "operations.workflow_analysis", name: "Workflow analysis", domain: "operations", description: "Analyze operational processes, coordination, and optimization.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
  { id: "marketing.strategy", name: "Marketing strategy", domain: "marketing", description: "Develop positioning, campaigns, acquisition, and conversion recommendations.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
  { id: "sales.strategy", name: "Sales strategy", domain: "sales", description: "Analyze lead handling, proposals, quotation strategy, and customer journeys.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
  { id: "customer.operations", name: "Customer operations", domain: "customer", description: "Analyze customer requests, support workflows, drafts, and escalations.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
  { id: "verification.independent_review", name: "Independent verification", domain: "verification", description: "Check structured outputs for evidence, contradiction, risk, and requirement violations.", riskLevel: "high", requiredPermissions: ["emmy:use"] },
  { id: "website.health_check", name: "Website health inspection", domain: "website-reliability", description: "Inspect supplied evidence from registered website availability, route, asset, link, UI, runtime, form, health-endpoint, and responsive checks without mutation.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
  { id: "website.health_report", name: "Website health reporting", domain: "website-reliability", description: "Classify evidence-backed website findings and recommend maintenance work without executing repairs.", riskLevel: "moderate", requiredPermissions: ["emmy:use"] },
] as const satisfies readonly SkillDefinition[];

export class SkillRegistry {
  private readonly byId = new Map<string, SkillDefinition>(); private readonly byDomain = new Map<string, SkillDefinition[]>();
  constructor(definitions: readonly SkillDefinition[] = productionSkills) { for (const definition of definitions) { if (!isValidSkillDefinition(definition)) throw new Error("INVALID_SKILL_SPEC"); if (this.byId.has(definition.id)) throw new Error(`DUPLICATE_SKILL:${definition.id}`); this.byId.set(definition.id, definition); this.byDomain.set(definition.domain, [...(this.byDomain.get(definition.domain) ?? []), definition]); } }
  get(id: string) { return this.byId.get(id); }
  list() { return [...this.byId.values()]; }
  listByDomain(domain: string) { return [...(this.byDomain.get(domain) ?? [])]; }
  isKnown(id: string) { return this.byId.has(id); }
  requirements(id: string) { return this.byId.get(id); }
  supportedBy(agent: { skills: string[] }) { return agent.skills.flatMap((id) => this.get(id) ? [this.get(id)!] : []); }
}
