import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { FrontendSourceActionService } from "../apps/averon-api/src/domains/frontend-source/frontend-source.actions.ts";
import { WorkspaceAuthorizationService } from "../apps/averon-api/src/domains/workspaces/workspace.service.ts";
import Home from "../src/pages/Home.tsx";
import { MemoryWorkspaceRepository } from "../apps/averon-api/test/http-harness.ts";

const auth = { user: { userId: "user-1", emailVerified: true, role: "owner" as const, isAdmin: true, permissions: [] } };

describe("mounted frontend source acceptance", () => {
  it("the bounded hero-actions patch is consumed by the mounted real Home component", async () => {
    const view = render(<MemoryRouter><Home /></MemoryRouter>);
    const actions = view.container.querySelector(".hero-actions");
    expect(actions).toBeTruthy();
    expect(actions?.children.length).toBe(2);

    const root = await mkdtemp(join(tmpdir(), "averon-mounted-source-"));
    await mkdir(join(root, "src", "styles"), { recursive: true });
    await writeFile(join(root, "src", "styles", "globals.css"), ".hero-actions {\n  display: flex;\n  gap: 16px;\n}\n", "utf8");
    const repository = new MemoryWorkspaceRepository({ businesses: [{ id: "averon", name: "Averon", slug: "averon", status: "active" }], workspaces: [{ id: "averon", businessId: "averon", name: "Averon", slug: "averon", status: "active" }], memberships: [{ id: "m1", userId: "user-1", workspaceId: "averon", businessId: "averon", role: "owner", status: "active" }] });
    const service = new FrontendSourceActionService(new WorkspaceAuthorizationService(repository), { async run() { return [{ name: "typecheck", passed: true }, { name: "lint", passed: true }, { name: "test", passed: true }, { name: "build", passed: true }]; } }, root);
    await service.propose(auth, "mounted-acceptance", "averon", [{ path: "src/styles/globals.css", find: "gap: 16px;", replace: "gap: 20px;" }]);
    await service.apply(auth, "averon", "mounted-acceptance");
    expect(await readFile(join(root, "src", "styles", "globals.css"), "utf8")).toContain(".hero-actions");
    expect(await readFile(join(root, "src", "styles", "globals.css"), "utf8")).toContain("gap: 20px;");
  });
});
