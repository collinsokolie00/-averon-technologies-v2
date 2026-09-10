import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { EmmyConversation, WorkspaceSummary } from "@averon/shared-types";

const { authenticatedUser } = vi.hoisted(() => ({
  authenticatedUser: { uid: "user-1", email: "owner@example.com", displayName: "Owner" },
}));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: unknown, listener: (user: typeof authenticatedUser) => void) => { listener(authenticatedUser); return () => undefined; },
  signInWithEmailAndPassword: vi.fn(), signInWithPopup: vi.fn(), signOut: vi.fn(),
}));
vi.mock("../src/firebase", () => ({ firebaseAuth: { currentUser: authenticatedUser }, googleAuthProvider: {} }));

import App from "../src/App";
import { averonApi } from "../src/api";
import { conversationGenerations } from "../src/chat-lifecycle";

beforeAll(() => { Element.prototype.scrollTo = vi.fn(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionStorage.clear(); });

const summary = (id: string, name: string): WorkspaceSummary => ({ workspace: { id, businessId: id, name, slug: id, status: "active" }, business: { id, name, slug: id, status: "active" }, role: "owner", permissions: ["emmy:use"] });
const averon = summary("averon", "Averon Technologies"); const lumora = summary("lumora", "Lumora");
const conversations: Record<string, EmmyConversation[]> = {
  averon: [{ id: "averon-conversation", userId: "user-1", workspaceId: "averon", title: "Averon operation", status: "active" }],
  lumora: [{ id: "lumora-conversation", userId: "user-1", workspaceId: "lumora", title: "Lumora planning", status: "active" }],
};

describe("mounted authenticated workspace conversation switching", () => {
  it("switches real App scope without leaking conversations or generation state and creates chat in the selected workspace", async () => {
    sessionStorage.setItem("averon:selected-workspace", "averon"); sessionStorage.setItem("averon:active-conversation", "averon-conversation");
    vi.spyOn(averonApi, "health").mockResolvedValue({ success: true, data: { status: "ok" }, requestId: "health" });
    vi.spyOn(averonApi, "session").mockResolvedValue({ success: true, data: { userId: "user-1", email: "owner@example.com", role: "owner", isAdmin: true }, requestId: "session" });
    vi.spyOn(averonApi.workspaces, "list").mockResolvedValue({ success: true, data: { items: [averon, lumora] }, requestId: "workspaces" });
    vi.spyOn(averonApi.business, "notifications").mockResolvedValue({ success: true, data: { items: [] }, requestId: "notifications" });
    const list = vi.spyOn(averonApi.conversations, "listWorkspace").mockImplementation(async (workspaceId) => ({ success: true, data: { items: conversations[workspaceId] ?? [] }, requestId: `list-${workspaceId}` }));
    vi.spyOn(averonApi.conversations, "messages").mockResolvedValue({ success: true, data: { items: [] }, requestId: "messages" });
    const create = vi.spyOn(averonApi.conversations, "create").mockImplementation(async (workspaceId) => ({ success: true, data: { id: "lumora-new", userId: "user-1", workspaceId, title: "New conversation", status: "active" }, requestId: "create" }));

    let finish!: () => void; const active = conversationGenerations.start("averon-conversation", "Long Averon operation", () => new Promise<void>((resolve) => { finish = resolve; }));
    render(<MemoryRouter initialEntries={["/chat"]}><App/></MemoryRouter>);
    expect(await screen.findByText("Averon operation")).toBeTruthy(); expect(screen.queryByText("Lumora planning")).toBeNull(); expect(screen.getByLabelText("Averon operation is working")).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: "Change workspace" })); await screen.findByText("Your workspaces"); fireEvent.click(screen.getByRole("button", { name: "Open Lumora workspace" }));
    expect(await screen.findByText("Lumora planning")).toBeTruthy(); expect(screen.queryByText("Averon operation")).toBeNull(); expect(screen.queryByLabelText("Averon operation is working")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Collapse workspace conversations" })); expect(screen.queryByText("Lumora planning")).toBeNull(); fireEvent.click(screen.getByRole("button", { name: "Expand workspace conversations" })); expect(screen.getByText("Lumora planning")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "New chat" })); await waitFor(() => expect(create).toHaveBeenCalledWith("lumora")); expect(create).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("link", { name: "Workspaces" })); fireEvent.click(await screen.findByRole("button", { name: "Open Averon Technologies workspace" }));
    expect(await screen.findByText("Averon operation")).toBeTruthy(); expect(screen.queryByText("Lumora planning")).toBeNull(); expect(screen.getByLabelText("Averon operation is working")).toBeTruthy();
    expect(list.mock.calls.map(([workspaceId]) => workspaceId)).toEqual(expect.arrayContaining(["averon", "lumora"]));
    await act(async () => { finish(); await active; });
  });
});
