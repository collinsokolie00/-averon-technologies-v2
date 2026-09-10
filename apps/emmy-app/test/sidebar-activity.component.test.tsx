import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { EmmyConversation, WorkspaceSummary } from "@averon/shared-types";

vi.mock("../src/firebase", () => ({ firebaseAuth: { currentUser: null }, googleAuthProvider: {} }));

import { Shell } from "../src/App";
import { conversationGenerations, type ConversationGenerationEvent } from "../src/chat-lifecycle";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const workspace: WorkspaceSummary = {
  workspace: { id: "averon", businessId: "averon", name: "Averon Technologies", slug: "averon", status: "active" },
  business: { id: "averon", name: "Averon Technologies", slug: "averon", status: "active" },
  role: "owner",
  permissions: ["emmy:use"],
};
const conversations: EmmyConversation[] = [
  { id: "background-a", userId: "user-1", workspaceId: "averon", title: "Backend operation", status: "active" },
  { id: "viewing-b", userId: "user-1", workspaceId: "averon", title: "Current conversation", status: "active" },
];

describe("workspace conversation activity", () => {
  it("keeps branding and account identity outside the dedicated navigation scroll region", () => {
    const { container } = render(<MemoryRouter><Shell session={{ userId: "user-1", email: "owner@averon.test", role: "owner", isAdmin: false }} selectedWorkspace={workspace} unreadCount={0} conversations={conversations} activeConversationId="viewing-b" onNewConversation={async () => undefined} onSelectConversation={() => undefined} onDeleteConversation={async () => undefined}><div>Workspace content</div></Shell></MemoryRouter>);
    const sidebar = container.querySelector(".sidebar")!;
    const scrollRegion = sidebar.querySelector(".sidebar-scroll-region")!;
    const footer = sidebar.querySelector(".sidebar-footer")!;
    expect(scrollRegion.getAttribute("aria-label")).toBe("Primary navigation");
    expect(scrollRegion.contains(footer)).toBe(false);
    expect(sidebar.querySelector(".sidebar-head")?.parentElement).toBe(sidebar);
    expect(footer.textContent).toContain("owner");
  });
  it("keeps the originating spinner across collapse and publishes completion while another chat is active", async () => {
    let emit!: (event: ConversationGenerationEvent) => void; let finish!: () => void;
    const run = conversationGenerations.start("background-a", "Apply proposal", (onEvent) => { emit = onEvent; return new Promise<void>((resolve) => { finish = resolve; }); });
    const selected: string[] = [];
    render(<MemoryRouter initialEntries={["/diagnostics"]}><Shell session={{ userId: "user-1", role: "owner", isAdmin: true }} selectedWorkspace={workspace} unreadCount={0} conversations={conversations} activeConversationId="viewing-b" onNewConversation={async () => undefined} onSelectConversation={(item) => selected.push(item.id)} onDeleteConversation={async () => undefined}><div>Diagnostics content</div></Shell></MemoryRouter>);
    expect(screen.getByLabelText("Backend operation is working")).toBeTruthy();
    expect(screen.getAllByLabelText(/is working$/)).toHaveLength(1);
    expect(screen.queryByLabelText("Workspace has active generation")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Collapse workspace conversations" }));
    expect(screen.queryByText("Backend operation")).toBeNull();
    expect(screen.queryAllByLabelText(/is working$/)).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Expand workspace conversations" }));
    await act(async () => { emit({ type: "completed", requestId: "request-a", reply: "Applied", assistantMessage: { id: "assistant-a", content: "Applied" } }); finish(); await run; });
    await waitFor(() => expect(screen.queryByLabelText("Backend operation is working")).toBeNull());
    expect(screen.getByLabelText("Backend operation completed while away")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Backend operation" }));
    expect(selected).toEqual(["background-a"]);
    expect(screen.queryByLabelText("Backend operation completed while away")).toBeNull();
  });
});
