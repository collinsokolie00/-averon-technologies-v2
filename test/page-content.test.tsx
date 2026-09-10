import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AVERON_PUBLIC_PAGE_CONTENT } from "@averon/shared-types";
import Home from "../src/pages/Home";
import type { AiProvider } from "../apps/averon-api/src/ai/providers/ai-provider";
import { MemoryBusinessOsRepository, MemoryPageContentRepository, MemoryWorkspaceRepository, request } from "../apps/averon-api/test/http-harness";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../src/lib/averonApi", () => ({ averonApi: { pageContent: { get } } }));
describe("mounted canonical page-content consumer", () => {
  it("renders the exact canonical record updated through the Private Emmy production path", async () => {
    const repository = new MemoryPageContentRepository(Object.values(AVERON_PUBLIC_PAGE_CONTENT)); const workspace = new MemoryWorkspaceRepository({ businesses: [{ id: "averon", name: "Averon", slug: "averon", status: "active" }], workspaces: [{ id: "averon", businessId: "averon", name: "Averon", slug: "averon", status: "active" }], memberships: [{ id: "member", userId: "user-1", workspaceId: "averon", businessId: "averon", role: "owner", status: "active" }] }); const business = new MemoryBusinessOsRepository(); business.roots.set("averon", { workspaceId: "averon", businessId: "averon", status: "active", schemaVersion: 1 });
    const provider: AiProvider = { async generate() { return { text: JSON.stringify({ schemaVersion: "marketing.v1", agentId: "marketing", taskId: "task-1-marketing", status: "completed", summary: "Reviewed", output: { findings: [], recommendations: ["A better future"], risks: [], assumptions: [], missingInformation: [] }, warnings: [], missingInformation: [] }) }; } };
    const result = await request("/api/v1/workspaces/averon/emmy/messages", { method: "POST", authorization: "Bearer valid", requestId: "mounted-acceptance", body: { message: "Change the homepage hero heading to “Canonical production-path hero”" }, workspaceRepository: workspace, businessOsRepository: business, pageContentRepository: repository, aiProvider: provider }); expect(result.payload.data.finalStatus).toBe("completed"); expect(repository.writes).toBe(1);
    get.mockImplementation(async () => ({ success: true, requestId: "public-reader", data: await repository.get("averon", "home") })); render(<MemoryRouter><Home /></MemoryRouter>); await waitFor(() => expect(screen.getByText("Canonical production-path hero")).toBeTruthy());
  });
  it("renders the exact canonical value returned by the public reader without remount", async () => { const updated = structuredClone(AVERON_PUBLIC_PAGE_CONTENT.home); updated.sections[0].fields.heading = "Canonical action-updated hero"; get.mockResolvedValue({ success: true, requestId: "reader", data: updated }); render(<MemoryRouter><Home /></MemoryRouter>); expect(screen.getByText(String(AVERON_PUBLIC_PAGE_CONTENT.home.sections[0].fields.heading))).toBeTruthy(); await waitFor(() => expect(screen.getByText("Canonical action-updated hero")).toBeTruthy()); });
  it("keeps bundled canonical fallback when the reader is unavailable", async () => { get.mockRejectedValue(new Error("offline")); render(<MemoryRouter><Home /></MemoryRouter>); expect(screen.getByText(String(AVERON_PUBLIC_PAGE_CONTENT.home.sections[0].fields.heading))).toBeTruthy(); });
});
