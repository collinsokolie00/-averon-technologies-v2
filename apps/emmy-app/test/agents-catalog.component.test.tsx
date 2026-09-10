import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { AgentCatalogItem, AgentCatalogResponse, WorkspacePermissionProjection } from "@averon/shared-types";
vi.mock("../src/firebase", () => ({ firebaseAuth: { currentUser: null }, googleAuthProvider: {} }));
import { AgentsCatalog } from "../src/App";

afterEach(cleanup);
const item = (id: string, displayName: string, displayRole: string): AgentCatalogItem => ({ id, displayName, displayRole, internalName: `${displayRole} AI`, description: "Authoritative specialist.", version: "1.0.0", readiness: "READY", readinessReasons: ["Ready."], skills: [{ id: `${id}.skill`, name: `${displayRole} skill`, domain: id, description: "Authoritative skill definition.", riskLevel: "moderate", requiredPermissions: ["emmy:use"], requiredTools: [] }], capabilities: ["structured_recommendation"], allowedTaskTypes: [id], providerRequirements: ["ai.text_generation"], modelCapabilities: ["structured_output"], executionRights: ["read", "analyze", "draft", "recommend"], schemaVersion: `${id}.v1`, certification: { lastEvalStatus: "passed", certificationStatus: "passed", certifiedSchemaVersion: `${id}.v1` }, businessOsAccess: "internal", requiredPermissions: ["emmy:use"], riskLevel: "moderate", restrictions: ["Cannot publish, delete, deploy, modify production, contact customers, perform database writes, or execute source actions directly."] });
const identities = [["research", "Atlas", "Research Agent"], ["seo", "Mantis", "SEO Agent"], ["blog", "Scribe", "Writing Agent"], ["analytics", "Pulse", "Analytics Agent"], ["documentation", "Archive", "Documentation Agent"], ["frontend", "Canvas", "Frontend Agent"], ["backend", "Forge", "Backend Agent"], ["database", "Ledger", "Database Agent"], ["testing", "Probe", "QA Agent"], ["security", "Sentinel", "Security Agent"], ["business-operations", "Vector", "Business Operations Agent"], ["marketing", "Nova", "Marketing Agent"], ["sales", "Vantage", "Sales Agent"], ["customer-operations", "Relay", "Customer Operations Agent"], ["critic", "Oracle", "Critic / Verifier Agent"]] as const;
const catalog: AgentCatalogResponse = { workspace: { id: "averon", name: "Averon Technologies" }, items: identities.map(([id, name, role]) => item(id, name, role)), summary: { specialists: 15, ready: 15, unavailable: 0, providerCapability: "ai.text_generation · structured_output" } };
const permissions: WorkspacePermissionProjection = { workspace: catalog.workspace, role: "owner", agents: catalog.items.map((agent) => ({ id: agent.id, displayName: agent.displayName, displayRole: agent.displayRole, readiness: agent.readiness, specialistAuthority: [...agent.executionRights.map((right) => ({ id: `${agent.id}.${right}`, label: right, state: "automatic" as const, explanation: "Authorized specialist work.", approvalRequired: false })), { id: `${agent.id}.mutate`, label: "Direct mutation", state: "blocked" as const, explanation: "Specialists do not mutate directly.", approvalRequired: false }], skills: [], relatedActions: agent.id === "seo" ? [{ id: "seo.metadata.update", label: "SEO metadata update", state: "automatic", explanation: "Server controlled.", approvalRequired: false, serverControlled: true }] : [] })), actions: [], boundaries: [] };

describe("mounted read-only Agents catalog", () => {
  it("renders all 15 authoritative display identities and summary without runtime-status fabrication", () => {
    render(<MemoryRouter><AgentsCatalog catalog={catalog} permissions={permissions}/></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Agent Control Center" })).toBeTruthy();
    expect(screen.getAllByText("15")).toHaveLength(2);
    for (const [, name, role] of identities) { expect(screen.getByRole("button", { name: new RegExp(`${name}.*${role}`) })).toBeTruthy(); }
    expect(screen.queryByText("Idle")).toBeNull(); expect(screen.queryByText("Working")).toBeNull();
  });

  it("opens a read-only detail surface backed by skill, permission and certification data", () => {
    render(<MemoryRouter><AgentsCatalog catalog={catalog} permissions={permissions}/></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Mantis.*SEO Agent/ }));
    expect(screen.getByText("seo", { exact: true })).toBeTruthy();
    expect(screen.getByText("seo.v1", { exact: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Skills" })); expect(screen.getByText("seo.skill")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Permissions" })); expect(screen.getByText("Direct mutation")).toBeTruthy(); expect(screen.getByText("SEO metadata update")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Certification" })); expect(screen.getAllByText("passed", { exact: false }).length).toBeGreaterThan(0);
  });
});
