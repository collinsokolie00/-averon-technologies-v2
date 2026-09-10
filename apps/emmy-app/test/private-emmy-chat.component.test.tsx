import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { EmmyConversation, EmmyStreamEvent, WorkspaceSummary } from "@averon/shared-types";

vi.mock("../src/firebase", () => ({ firebaseAuth: { currentUser: null }, googleAuthProvider: {} }));

import { averonApi } from "../src/api";
import { PrivateEmmyChat } from "../src/App";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const workspace: WorkspaceSummary = {
  workspace: { id: "averon", businessId: "averon", name: "Averon Technologies", slug: "averon", status: "active" },
  business: { id: "averon", name: "Averon Technologies", slug: "averon", status: "active" },
  role: "owner",
  permissions: ["emmy:use"],
};

function mountedChat(conversation: EmmyConversation) {
  return render(<MemoryRouter><PrivateEmmyChat workspace={workspace} hasWorkspaces conversation={conversation} onConversationCreated={() => undefined} onConversationUpdated={async () => undefined}/></MemoryRouter>);
}

describe("mounted PrivateEmmyChat generation lifecycle", () => {
  it("materializes assistant A before user B and preserves four durable ordered turns", async () => {
    const conversation = { id: "ordered-turns", userId: "user-1", workspaceId: "averon", title: "Backend proposal", status: "active" as const };
    vi.spyOn(averonApi.conversations, "messages").mockResolvedValue({ success: true, data: { items: [] }, requestId: "messages" });
    let call = 0;
    vi.spyOn(averonApi.conversations, "stream").mockImplementation(async (_id, _message, options) => {
      call += 1; const current = call;
      await options.onEvent({ type: "started", requestId: `request-${current}`, conversationId: conversation.id, workspaceId: "averon" });
      const content = current === 1 ? "Backend proposal applied and verified" : "Yes. The durable action record confirms it.";
      const completed: Extract<EmmyStreamEvent, { type: "completed" }> = { type: "completed", requestId: `request-${current}`, conversationId: conversation.id, reply: content, assistantMessage: { id: `assistant-${current}`, conversationId: conversation.id, role: "assistant", content, generationStatus: "completed" } };
      await options.onEvent(completed); return completed;
    });
    const view = mountedChat(conversation); await screen.findByText("What would you like me to work on?");
    const send = async (content: string) => { fireEvent.change(screen.getByLabelText("Message Emmy"), { target: { value: content } }); fireEvent.submit(screen.getByLabelText("Message Emmy").closest("form")!); await waitFor(() => expect(averonApi.conversations.stream).toHaveBeenCalledTimes(call)); };
    await send("Apply backend source proposal proposal-a:backend.source.propose."); await screen.findByText("Backend proposal applied and verified");
    await send("So are you really sure you did this? Don't claim you did something you did not do."); await screen.findByText("Yes. The durable action record confirms it.");
    const turns = [...view.container.querySelectorAll("article.message")].map((item) => item.textContent ?? "");
    expect(turns).toHaveLength(4); expect(turns[0]).toContain("Apply backend source proposal"); expect(turns[1]).toContain("Backend proposal applied and verified"); expect(turns[2]).toContain("So are you really sure"); expect(turns[3]).toContain("durable action record");
    expect(averonApi.conversations.stream).toHaveBeenCalledTimes(2);
  });

  it("preserves four canonical ordered turns across unmount and remount hydration", async () => {
    const conversation = { id: "remount-order", userId: "user-1", workspaceId: "averon", title: "Durable turns", status: "active" as const };
    const items = [
      { id: "user-a", conversationId: conversation.id, role: "user" as const, content: "Prepare proposal", generationStatus: "completed" as const },
      { id: "assistant-a", conversationId: conversation.id, role: "assistant" as const, content: "Proposal prepared", generationStatus: "completed" as const },
      { id: "user-b", conversationId: conversation.id, role: "user" as const, content: "Did it apply?", generationStatus: "completed" as const },
      { id: "assistant-b", conversationId: conversation.id, role: "assistant" as const, content: "It remains pending", generationStatus: "completed" as const },
    ];
    vi.spyOn(averonApi.conversations, "messages").mockResolvedValue({ success: true, data: { items }, requestId: "messages" });
    const first = mountedChat(conversation); await screen.findByText("It remains pending"); first.unmount();
    const second = mountedChat(conversation); await screen.findByText("It remains pending");
    const turns = [...second.container.querySelectorAll("article.message")].map((item) => item.textContent ?? "");
    expect(turns).toHaveLength(4); expect(turns[0]).toContain("Prepare proposal"); expect(turns[1]).toContain("Proposal prepared"); expect(turns[2]).toContain("Did it apply?"); expect(turns[3]).toContain("It remains pending");
  });

  it("keeps working visible and renders a verified action completion without remount", async () => {
    const conversation = { id: "mounted-action", userId: "user-1", workspaceId: "averon", title: "Update draft", status: "active" as const };
    vi.spyOn(averonApi.conversations, "messages").mockResolvedValue({ success: true, data: { items: [{ id: "existing", conversationId: conversation.id, role: "assistant", content: "Existing transcript", generationStatus: "completed" }] }, requestId: "messages" });
    let emit!: (event: EmmyStreamEvent) => void | Promise<void>; let finish!: () => void;
    vi.spyOn(averonApi.conversations, "stream").mockImplementation(async (_id, _message, options) => {
      emit = options.onEvent; await emit({ type: "started", requestId: "request-action", conversationId: conversation.id, workspaceId: "averon" });
      await new Promise<void>((resolve) => { finish = resolve; });
      const completed: Extract<EmmyStreamEvent, { type: "completed" }> = { type: "completed", requestId: "request-action", conversationId: conversation.id, reply: "Draft updated successfully", assistantMessage: { id: "assistant-action", conversationId: conversation.id, role: "assistant", content: "Draft updated successfully", generationStatus: "completed" }, action: { actionId: "action-1", actionType: "blog.draft.update", status: "completed", verificationStatus: "passed", draftId: "draft-1", specialists: [], warnings: [] } };
      await emit(completed); return completed;
    });
    const view = mountedChat(conversation); await screen.findByText("Existing transcript");
    fireEvent.change(screen.getByLabelText("Message Emmy"), { target: { value: "Update the draft" } }); fireEvent.submit(screen.getByLabelText("Message Emmy").closest("form")!);
    expect(await screen.findByText("Emmy is working…")).toBeTruthy();
    expect(view.container.textContent).not.toContain("Draft updated successfully");
    await act(async () => { finish(); });
    await waitFor(() => expect(screen.getByText("Draft updated successfully")).toBeTruthy());
    expect(screen.queryByText("Emmy is working…")).toBeNull();
    expect(view.container.querySelectorAll(".message.assistant")).toHaveLength(2);
    expect(averonApi.conversations.stream).toHaveBeenCalledTimes(1);
  });

  it("renders an authoritative approval card and double-click invokes one apply turn", async () => {
    const conversation = { id: "approval-card", userId: "user-1", workspaceId: "averon", title: "Backend proposal", status: "active" as const };
    vi.spyOn(averonApi.conversations, "messages").mockResolvedValue({ success: true, data: { items: [{ id: "proposal-message", conversationId: conversation.id, role: "assistant", content: "Backend proposal prepared", generationStatus: "completed", action: { actionId: "proposal-a:backend.source.propose", actionType: "backend.source.propose", status: "approval_required", approvalStatus: "pending", verificationStatus: "pending", targetFiles: ["apps/averon-api/src/app.ts"], symbols: ["GET /health"], risk: "low", changedLines: 2, warnings: [] } }] }, requestId: "messages" });
    let release!: () => void;
    vi.spyOn(averonApi.conversations, "stream").mockImplementation(async (_id, message, options) => { expect(message).toBe("Apply backend source proposal proposal-a:backend.source.propose."); await options.onEvent({ type: "started", requestId: "apply", conversationId: conversation.id, workspaceId: "averon" }); await new Promise<void>((resolve) => { release = resolve; }); const completed: Extract<EmmyStreamEvent, { type: "completed" }> = { type: "completed", requestId: "apply", conversationId: conversation.id, reply: "Applied and verified", assistantMessage: { id: "applied", conversationId: conversation.id, role: "assistant", content: "Applied and verified", generationStatus: "completed" }, action: { actionId: "proposal-a:backend.source.propose", actionType: "backend.source.apply", status: "completed", approvalStatus: "approved", verificationStatus: "passed", targetFiles: ["apps/averon-api/src/app.ts"], symbols: ["GET /health"], risk: "low", changedLines: 2, warnings: [] } }; await options.onEvent(completed); return completed; });
    mountedChat(conversation); await screen.findByText("Awaiting approval"); const approve = screen.getByRole("button", { name: "Approve" }); fireEvent.click(approve); fireEvent.click(approve);
    await waitFor(() => expect(averonApi.conversations.stream).toHaveBeenCalledTimes(1)); expect(await screen.findByText("Emmy is working…")).toBeTruthy(); await act(async () => release()); await screen.findByText("Applied and verified"); expect(screen.getByText("Completed")).toBeTruthy();
  });

  it("does not let a prior identical prompt suppress the current terminal completion", async () => {
    const conversation = { id: "repeated-prompt", userId: "user-1", workspaceId: "averon", title: "Update draft", status: "active" as const };
    const prior = [
      { id: "old-user", conversationId: conversation.id, role: "user" as const, content: "Update the draft", generationStatus: "completed" as const },
      { id: "old-assistant", conversationId: conversation.id, role: "assistant" as const, content: "Earlier failed response", generationStatus: "completed" as const },
    ];
    vi.spyOn(averonApi.conversations, "messages").mockResolvedValue({ success: true, data: { items: prior }, requestId: "messages" });
    let finish!: () => void;
    vi.spyOn(averonApi.conversations, "stream").mockImplementation(async (_id, _message, options) => {
      await options.onEvent({ type: "started", requestId: "current-request", conversationId: conversation.id, workspaceId: "averon" });
      await new Promise<void>((resolve) => { finish = resolve; });
      const completed: Extract<EmmyStreamEvent, { type: "completed" }> = { type: "completed", requestId: "current-request", conversationId: conversation.id, reply: "Current verified response", assistantMessage: { id: "current-assistant", conversationId: conversation.id, role: "assistant", content: "Current verified response", generationStatus: "completed" } };
      await options.onEvent(completed); return completed;
    });
    const view = mountedChat(conversation); await screen.findByText("Earlier failed response");
    fireEvent.change(screen.getByLabelText("Message Emmy"), { target: { value: "Update the draft" } }); fireEvent.submit(screen.getByLabelText("Message Emmy").closest("form")!);
    expect(await screen.findByText("Emmy is working…")).toBeTruthy();
    await act(async () => { await Promise.resolve(); });
    await act(async () => { finish(); });
    await waitFor(() => expect(screen.getByText("Current verified response")).toBeTruthy());
    expect(view.container.querySelectorAll(".message.assistant")).toHaveLength(2);
    expect(averonApi.conversations.stream).toHaveBeenCalledTimes(1);
  });

  it("keeps the mounted working row visible for thirty simulated seconds before the first token", async () => {
    const conversation = { id: "slow-first-token", userId: "user-1", workspaceId: "averon", title: "Slow", status: "active" as const };
    vi.spyOn(averonApi.conversations, "messages").mockResolvedValue({ success: true, data: { items: [] }, requestId: "messages" });
    vi.spyOn(averonApi.conversations, "stream").mockImplementation(async (_id, _message, options) => { await options.onEvent({ type: "started", requestId: "slow", conversationId: conversation.id, workspaceId: "averon" }); await new Promise(() => undefined); throw new Error("unreachable"); });
    mountedChat(conversation); await screen.findByText("What would you like me to work on?");
    fireEvent.change(screen.getByLabelText("Message Emmy"), { target: { value: "Slow request" } }); fireEvent.submit(screen.getByLabelText("Message Emmy").closest("form")!);
    expect(await screen.findByText("Emmy is working…")).toBeTruthy(); vi.useFakeTimers();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); }); expect(screen.getByText("Emmy is working…")).toBeTruthy();
  });

  it("renders synthesis streaming with the existing glow and then one canonical completion", async () => {
    const conversation = { id: "mounted-synthesis", userId: "user-1", workspaceId: "averon", title: "Synthesis", status: "active" as const };
    vi.spyOn(averonApi.conversations, "messages").mockResolvedValue({ success: true, data: { items: [] }, requestId: "messages" });
    let finish!: () => void;
    vi.spyOn(averonApi.conversations, "stream").mockImplementation(async (_id, _message, options) => { await options.onEvent({ type: "started", requestId: "synthesis", conversationId: conversation.id, workspaceId: "averon" }); await options.onEvent({ type: "delta", requestId: "synthesis", conversationId: conversation.id, content: "Streaming answer" }); await new Promise<void>((resolve) => { finish = resolve; }); const completed: Extract<EmmyStreamEvent, { type: "completed" }> = { type: "completed", requestId: "synthesis", conversationId: conversation.id, reply: "Canonical synthesis", assistantMessage: { id: "assistant-synthesis", conversationId: conversation.id, role: "assistant", content: "Canonical synthesis", generationStatus: "completed" } }; await options.onEvent(completed); return completed; });
    const view = mountedChat(conversation); await screen.findByText("What would you like me to work on?"); fireEvent.change(screen.getByLabelText("Message Emmy"), { target: { value: "Analyze this" } }); fireEvent.submit(screen.getByLabelText("Message Emmy").closest("form")!);
    await screen.findByText("Streaming answer"); expect(view.container.querySelector(".streaming-body .streaming-text")).toBeTruthy(); await act(async () => { finish(); }); await screen.findByText("Canonical synthesis");
    expect(view.container.querySelectorAll(".message.assistant")).toHaveLength(1); expect(averonApi.conversations.stream).toHaveBeenCalledTimes(1);
  });

  it("keeps recovery visible and converges to persisted completion after transport loss", async () => {
    const conversation = { id: "mounted-recovery", userId: "user-1", workspaceId: "averon", title: "Recovery", status: "active" as const };
    const baseline = [{ id: "existing-user", conversationId: conversation.id, role: "user" as const, content: "Earlier", generationStatus: "completed" as const }]; let loads = 0;
    vi.spyOn(averonApi.conversations, "messages").mockImplementation(async () => { loads += 1; const items = loads < 3 ? baseline : [...baseline, { id: "new-user", conversationId: conversation.id, role: "user" as const, content: "Recover this", generationStatus: "completed" as const }, { id: "persisted-assistant", conversationId: conversation.id, role: "assistant" as const, content: "Recovered canonical", generationStatus: "completed" as const }]; return { success: true, data: { items }, requestId: `messages-${loads}` }; });
    vi.spyOn(averonApi.conversations, "stream").mockImplementation(async (_id, _message, options) => { await options.onEvent({ type: "started", requestId: "recover", conversationId: conversation.id, workspaceId: "averon" }); throw new TypeError("network lost"); });
    mountedChat(conversation); await screen.findByText("Earlier"); fireEvent.change(screen.getByLabelText("Message Emmy"), { target: { value: "Recover this" } }); fireEvent.submit(screen.getByLabelText("Message Emmy").closest("form")!);
    expect(await screen.findByText("Emmy is reconnecting…")).toBeTruthy(); await waitFor(() => expect(screen.getByText("Recovered canonical")).toBeTruthy(), { timeout: 2_500 }); expect(screen.queryByText("Emmy is reconnecting…")).toBeNull(); expect(averonApi.conversations.stream).toHaveBeenCalledTimes(1);
  });

  it("renders authoritative structured table, diff, and file surfaces from persisted metadata", async () => {
    const conversation = { id: "structured", userId: "user-1", workspaceId: "averon", title: "Structured result", status: "active" as const };
    vi.spyOn(averonApi.conversations, "messages").mockResolvedValue({ success: true, data: { items: [{
      id: "structured-assistant", conversationId: conversation.id, role: "assistant", content: "Verified result", generationStatus: "completed",
      presentation: [
        { type: "table", columns: ["Check", "Result"], rows: [["Validation", "Passed"]] },
        { type: "diff", content: "- old\n+ new", language: "diff" },
        { type: "file", path: "src/styles/globals.css", status: "completed", summary: "Verified file" },
      ],
    }] }, requestId: "messages" });
    const view = mountedChat(conversation);
    await screen.findByText("Verified result");
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("Validation")).toBeTruthy();
    expect(view.container.querySelector(".structured-code.diff")?.textContent).toBe("- old\n+ new");
    expect(screen.getByText("src/styles/globals.css")).toBeTruthy();
    expect(view.container.querySelectorAll(".structured-surfaces")).toHaveLength(1);
  });

  it("renders authoritative failed, rolled-back, no-op, and rejected operation states", async () => {
    const conversation = { id: "terminal-cards", userId: "user-1", workspaceId: "averon", title: "Operations", status: "active" as const };
    const base = { actionType: "backend.source.apply" as const, approvalStatus: "approved" as const, targetFiles: ["apps/averon-api/src/app.ts"], symbols: ["GET /health"], risk: "low" as const, changedLines: 1, deploymentStatus: "not_performed" as const };
    const actions = [
      { ...base, actionId: "failed:backend.source.propose", status: "failed" as const, verificationStatus: "pending" as const, rollbackStatus: "failed" as const, warnings: ["SOURCE_CONFLICT"] },
      { ...base, actionId: "rolled:backend.source.propose", status: "failed" as const, verificationStatus: "failed" as const, rollbackStatus: "completed" as const, warnings: [] },
      { ...base, actionId: "noop:backend.source.propose", status: "completed" as const, verificationStatus: "passed" as const, rollbackStatus: "not_required" as const, changedLines: 0, warnings: ["SOURCE_ALREADY_SATISFIED"] },
      { ...base, actionId: "rejected:backend.source.propose", actionType: "backend.source.propose" as const, status: "rejected" as const, approvalStatus: "rejected" as const, verificationStatus: "pending" as const, rollbackStatus: "not_required" as const, warnings: [] },
    ];
    vi.spyOn(averonApi.conversations, "messages").mockResolvedValue({ success: true, data: { items: actions.map((action, index) => ({ id: `terminal-${index}`, conversationId: conversation.id, role: "assistant" as const, content: `Operation ${index}`, generationStatus: "completed" as const, action })) }, requestId: "messages" });
    const view = mountedChat(conversation);
    await waitFor(() => expect(view.container.querySelectorAll(".operation-card")).toHaveLength(4));
    for (const state of ["Failed", "Rolled back", "No change required", "Rejected"]) expect(screen.getByText(state)).toBeTruthy();
    expect(screen.getAllByText("SOURCE_CONFLICT").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the live-shaped frontend proposal as a structured approval card", async () => {
    const conversation = { id: "frontend-approval", userId: "user-1", workspaceId: "averon", title: "Frontend proposal", status: "active" as const };
    const actionId = "live-20-to-22:frontend.source.propose";
    vi.spyOn(averonApi.conversations, "messages").mockResolvedValue({ success: true, data: { items: [{ id: "frontend-proposal", conversationId: conversation.id, role: "assistant", content: "Frontend source proposal prepared", generationStatus: "completed", action: { actionId, actionType: "frontend.source.propose", status: "approval_required", approvalStatus: "pending", verificationStatus: "pending", deploymentStatus: "not_performed", targetFiles: ["src/styles/globals.css"], changedLines: 2, insertions: 1, deletions: 1, summary: "Desktop hero action spacing: 20px to 22px", diff: "-  gap: 20px;\n+  gap: 22px;", warnings: [] } }] }, requestId: "messages" });
    const view = mountedChat(conversation); await screen.findByText("Awaiting approval");
    expect(screen.getByText("Desktop hero action spacing: 20px to 22px")).toBeTruthy(); expect(screen.getByText("src/styles/globals.css")).toBeTruthy(); expect(screen.getByRole("button", { name: "Approve" })).toBeTruthy(); expect(screen.getByRole("button", { name: "Reject" })).toBeTruthy(); expect(view.container.querySelector(".structured-code.diff")?.textContent).toContain("gap: 22px");
  });

  it("evolves one operation card from approval through applying to verified completion", async () => {
    const conversation = { id: "evolving-card", userId: "user-1", workspaceId: "averon", title: "Apply", status: "active" as const };
    const actionId = "proposal-evolve:frontend.source.propose";
    vi.spyOn(averonApi.conversations, "messages").mockResolvedValue({ success: true, data: { items: [{ id: "proposal", conversationId: conversation.id, role: "assistant", content: "Ready", generationStatus: "completed", action: { actionId, actionType: "frontend.source.propose", status: "approval_required", approvalStatus: "pending", verificationStatus: "pending", targetFiles: ["src/styles/globals.css"], risk: "low", changedLines: 1, warnings: [] } }] }, requestId: "messages" });
    let continueToVerify!: () => void; let continueToComplete!: () => void;
    vi.spyOn(averonApi.conversations, "stream").mockImplementation(async (_id, _message, options) => {
      await options.onEvent({ type: "started", requestId: "apply-evolve", conversationId: conversation.id, workspaceId: "averon" });
      await options.onEvent({ type: "action_status", requestId: "apply-evolve", conversationId: conversation.id, action: { actionId, actionType: "frontend.source.apply", status: "applying", approvalStatus: "approved", verificationStatus: "pending", deploymentStatus: "not_performed", targetFiles: ["src/styles/globals.css"], changedLines: 1, insertions: 1, deletions: 1, warnings: [] }, assistantMessage: { id: "operation-stable", conversationId: conversation.id, role: "assistant", content: "Applying", generationStatus: "processing" } });
      await new Promise<void>((resolve) => { continueToVerify = resolve; });
      await options.onEvent({ type: "action_status", requestId: "apply-evolve", conversationId: conversation.id, action: { actionId, actionType: "frontend.source.apply", status: "verifying", approvalStatus: "approved", verificationStatus: "pending", deploymentStatus: "not_performed", targetFiles: ["src/styles/globals.css"], changedLines: 1, insertions: 1, deletions: 1, warnings: [] }, assistantMessage: { id: "operation-stable", conversationId: conversation.id, role: "assistant", content: "Verifying", generationStatus: "processing" } });
      await new Promise<void>((resolve) => { continueToComplete = resolve; });
      const completed: Extract<EmmyStreamEvent, { type: "completed" }> = { type: "completed", requestId: "apply-evolve", conversationId: conversation.id, reply: "Verified", assistantMessage: { id: "verified", conversationId: conversation.id, role: "assistant", content: "Verified", generationStatus: "completed" }, action: { actionId, actionType: "frontend.source.apply", status: "completed", approvalStatus: "approved", verificationStatus: "passed", targetFiles: ["src/styles/globals.css"], risk: "low", changedLines: 1, warnings: [] } };
      await options.onEvent(completed); return completed;
    });
    const view = mountedChat(conversation); await screen.findByText("Awaiting approval");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(view.container.querySelector(".operation-applying .badge")?.textContent).toBe("Applying"));
    await act(async () => continueToVerify()); await waitFor(() => expect(view.container.querySelector(".operation-verifying .badge")?.textContent).toBe("Verifying"));
    await act(async () => continueToComplete()); await screen.findByText("Verified");
    expect(view.container.querySelectorAll(`[data-action-id="${actionId}"]`)).toHaveLength(1);
    expect(screen.getByText("Completed")).toBeTruthy();
  });

  it("rejects through one server-authoritative turn and never exposes apply afterward", async () => {
    const conversation = { id: "reject-card", userId: "user-1", workspaceId: "averon", title: "Reject", status: "active" as const };
    const actionId = "proposal-reject:backend.source.propose";
    vi.spyOn(averonApi.conversations, "messages").mockResolvedValue({ success: true, data: { items: [{ id: "proposal", conversationId: conversation.id, role: "assistant", content: "Ready", generationStatus: "completed", action: { actionId, actionType: "backend.source.propose", status: "approval_required", approvalStatus: "pending", verificationStatus: "pending", targetFiles: ["apps/averon-api/src/app.ts"], symbols: ["GET /health"], risk: "low", changedLines: 2, warnings: [] } }] }, requestId: "messages" });
    vi.spyOn(averonApi.conversations, "stream").mockImplementation(async (_id, message, options) => {
      expect(message).toBe(`Reject backend source proposal ${actionId}.`); await options.onEvent({ type: "started", requestId: "reject", conversationId: conversation.id, workspaceId: "averon" });
      const completed: Extract<EmmyStreamEvent, { type: "completed" }> = { type: "completed", requestId: "reject", conversationId: conversation.id, reply: "Rejected", assistantMessage: { id: "rejected", conversationId: conversation.id, role: "assistant", content: "Rejected", generationStatus: "completed" }, action: { actionId, actionType: "backend.source.propose", status: "rejected", approvalStatus: "rejected", verificationStatus: "pending", targetFiles: ["apps/averon-api/src/app.ts"], symbols: ["GET /health"], risk: "low", changedLines: 2, warnings: [] } };
      await options.onEvent(completed); return completed;
    });
    const view = mountedChat(conversation); await screen.findByText("Awaiting approval"); fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    await screen.findAllByText("Rejected"); expect(averonApi.conversations.stream).toHaveBeenCalledTimes(1); expect(screen.queryByRole("button", { name: "Approve" })).toBeNull(); expect(view.container.querySelectorAll(`[data-action-id="${actionId}"]`)).toHaveLength(1);
  });
});
