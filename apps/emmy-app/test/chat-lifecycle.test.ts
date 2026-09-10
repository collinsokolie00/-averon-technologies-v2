import test from "node:test";
import assert from "node:assert/strict";
import { assistantActivityPresentation, ConversationGenerationCoordinator, formatMessageTime, isActiveSendConversationActivation, isNearChatBottom, mergePersistedTerminal, mergeStreamCompletion, mergeStreamDelta, refreshConversationList, retainedConversationId, transcriptScopeKey, type ConversationGenerationEvent, type ConversationGenerationSnapshot } from "../src/chat-lifecycle.ts";
import { AveronApiClient } from "@averon/api-client";

test("activating a conversation created by the active send preserves that stream", () => {
  assert.equal(isActiveSendConversationActivation("new-conversation", "new-conversation"), true);
  assert.equal(isActiveSendConversationActivation("new-conversation", "another-conversation"), false);
  assert.equal(isActiveSendConversationActivation("", "new-conversation"), false);
});

test("workspace hydration cannot reopen a persisted transcript during an active conversation send", () => {
  assert.equal(transcriptScopeKey("conversation-1", undefined), "conversation:conversation-1");
  assert.equal(transcriptScopeKey("conversation-1", "averon"), "conversation:conversation-1");
  assert.notEqual(transcriptScopeKey(undefined, undefined), transcriptScopeKey(undefined, "averon"));
});

test("one stream send makes exactly one POST to the active conversation and preserves its canonical completion", async () => {
  const originalFetch = globalThis.fetch; const requests: Array<{ url: string; method: string; body: string }> = [];
  globalThis.fetch = async (input, init) => { requests.push({ url: String(input), method: String(init?.method), body: String(init?.body) }); const event = { type: "completed", requestId: "request-1", reply: "Fresh response", assistantMessage: { id: "assistant-1", conversationId: "conversation-1", role: "assistant", content: "Fresh response", generationStatus: "completed", createdAt: "2026-08-25T00:00:00.000Z" } }; return new Response(`${JSON.stringify(event)}\n`, { status: 200, headers: { "Content-Type": "application/x-ndjson" } }); };
  try {
    const client = new AveronApiClient({ baseUrl: "http://localhost:8787", getAuthToken: async () => "token" }); let completed = "";
    await client.conversations.stream("conversation-1", "Prompt 1", { onEvent: (event) => { if (event.type === "completed") completed = event.reply; } });
    assert.deepEqual(requests, [{ url: "http://localhost:8787/api/v1/emmy/conversations/conversation-1/messages/stream", method: "POST", body: JSON.stringify({ message: "Prompt 1" }) }]);
    assert.equal(completed, "Fresh response");
    assert.deepEqual(mergeStreamCompletion([{ id: "user-1", role: "user", content: "Prompt 1" }], { id: "assistant-1", role: "assistant", content: completed }), [{ id: "user-1", role: "user", content: "Prompt 1" }, { id: "assistant-1", role: "assistant", content: "Fresh response" }]);
  } finally { globalThis.fetch = originalFetch; }
});

test("sidebar refresh failure cannot turn a completed response into a failed send", async () => {
  let attempted = false;
  refreshConversationList(async () => { attempted = true; throw new Error("list unavailable"); });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(attempted, true);
});

test("persisted Firestore and ISO message times render consistently", () => {
  assert.equal(formatMessageTime("2026-08-24T12:01:50.000Z", "en-GB", "UTC"), "12:01");
  assert.equal(formatMessageTime({ _seconds: 1_777_118_510 }, "en-GB", "UTC"), "12:01");
  assert.equal(formatMessageTime({ bad: true }, "en-GB"), "");
});

test("a persisted conversation survives refresh only while still authorized", () => {
  assert.equal(retainedConversationId("conversation-1", ["conversation-1", "conversation-2"]), "conversation-1");
  assert.equal(retainedConversationId("revoked", ["conversation-1"]), "");
});

test("stream completion appends canonically even when no provisional assistant row was committed", () => {
  const user = { id: "user", role: "user" as const, content: "Request" };
  const provisional = { id: "stream", role: "assistant" as const, content: "Partial", streaming: true };
  const canonical = { id: "assistant", role: "assistant" as const, content: "Complete" };
  assert.deepEqual(mergeStreamDelta([user], provisional), [user, provisional]);
  assert.deepEqual(mergeStreamCompletion([user], canonical), [user, canonical]);
  assert.deepEqual(mergeStreamCompletion([user, provisional], canonical), [user, canonical]);
});

test("chat follow mode uses a small bottom threshold", () => {
  assert.equal(isNearChatBottom(780, 600, 1500), true);
  assert.equal(isNearChatBottom(500, 600, 1500), false);
});

test("route unmount and remount preserve one active generation and its canonical completion", async () => {
  const coordinator = new ConversationGenerationCoordinator(); let posts = 0; let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
  const run = coordinator.start("conversation-1", "Prompt 1", async (onEvent) => { posts += 1; onEvent({ type: "delta", content: "Part" }); await gate; onEvent({ type: "completed", reply: "Complete", assistantMessage: { id: "assistant-1", content: "Complete" } }); });
  const returned: string[] = []; const unsubscribe = coordinator.subscribe("conversation-1", (snapshot) => returned.push(`${snapshot.status}:${snapshot.content}`)); unsubscribe();
  assert.equal(coordinator.isActive("conversation-1"), true);
  const afterNavigation: string[] = []; coordinator.subscribe("conversation-1", (snapshot) => afterNavigation.push(`${snapshot.status}:${snapshot.content}`));
  const duplicate = coordinator.start("conversation-1", "Prompt 1", async () => { posts += 1; });
  assert.equal(duplicate, run); assert.equal(posts, 1); assert.deepEqual(returned, ["streaming:Part"]); assert.deepEqual(afterNavigation, ["streaming:Part"]);
  release(); await run;
  assert.equal(coordinator.snapshot("conversation-1")?.status, "completed"); assert.equal(coordinator.snapshot("conversation-1")?.completion?.assistantMessage.id, "assistant-1"); assert.equal(posts, 1);
});

test("persisted canonical completion reconciles a stale streaming snapshot after remount", () => {
  const coordinator = new ConversationGenerationCoordinator(); let posts = 0;
  void coordinator.start("conversation-2", "Prompt 2", async (onEvent) => { posts += 1; onEvent({ type: "delta", content: "Buffered" }); await new Promise(() => undefined); });
  assert.equal(coordinator.snapshot("conversation-2")?.status, "streaming");
  const reconciled = coordinator.reconcilePersistedMessages("conversation-2", [{ id: "user-2", role: "user", content: "Prompt 2", generationStatus: "completed" }, { id: "assistant-2", role: "assistant", content: "Canonical response", generationStatus: "completed" }]);
  assert.equal(reconciled, true); assert.equal(coordinator.snapshot("conversation-2")?.status, "completed"); assert.equal(coordinator.snapshot("conversation-2")?.content, "Canonical response"); assert.equal(coordinator.isActive("conversation-2"), false); assert.equal(posts, 1);
  assert.equal(coordinator.reconcilePersistedMessages("conversation-2", [{ id: "old", role: "assistant", content: "Stale", generationStatus: "completed" }]), false);
});

test("persistence reconciliation ignores baseline messages from an earlier identical prompt", async () => {
  const coordinator = new ConversationGenerationCoordinator(); const snapshots: ConversationGenerationSnapshot[] = [];
  const run = coordinator.start("repeat", "Same prompt", async (onEvent) => { onEvent({ type: "started", requestId: "current" }); await new Promise(() => undefined); }, { knownPersistedMessageIds: ["old-user", "old-assistant"] });
  coordinator.subscribe("repeat", (snapshot) => snapshots.push(snapshot));
  const old = [{ id: "old-user", role: "user" as const, content: "Same prompt", generationStatus: "completed" as const }, { id: "old-assistant", role: "assistant" as const, content: "Old response", generationStatus: "completed" as const }];
  assert.equal(coordinator.reconcilePersistedMessages("repeat", old), false); assert.equal(coordinator.snapshot("repeat")?.status, "processing");
  const current = [...old, { id: "new-user", role: "user" as const, content: "Same prompt", generationStatus: "completed" as const }, { id: "new-assistant", role: "assistant" as const, content: "Current response", generationStatus: "completed" as const }];
  assert.equal(coordinator.reconcilePersistedMessages("repeat", current), true); assert.equal(coordinator.snapshot("repeat")?.content, "Current response"); assert.equal(snapshots.at(-1)?.status, "completed"); void run;
});

test("each immutable terminal publication changes snapshot identity and notifies once", async () => {
  const coordinator = new ConversationGenerationCoordinator(); const identities: Array<ConversationGenerationSnapshot | undefined> = []; let notifications = 0;
  const unsubscribe = coordinator.subscribeChanges("identity", () => { notifications += 1; identities.push(coordinator.snapshot("identity")); });
  await coordinator.start("identity", "Prompt", async (onEvent) => { onEvent({ type: "completed", reply: "Done", assistantMessage: { id: "assistant", content: "Done" } }); }); unsubscribe();
  assert.equal(notifications, 2); assert.notEqual(identities[0], identities[1]); assert.equal(identities[1]?.status, "completed");
});

test("normal terminal stream completion settles while Chat remains mounted", async () => {
  const coordinator = new ConversationGenerationCoordinator(); let posts = 0; const states: string[] = [];
  const run = coordinator.start("mounted", "Prompt", async (onEvent) => { posts += 1; onEvent({ type: "started" }); onEvent({ type: "delta", content: "Partial" }); onEvent({ type: "completed", reply: "Canonical", assistantMessage: { id: "assistant-mounted", content: "Canonical" } }); });
  coordinator.subscribe("mounted", (snapshot) => states.push(snapshot.status)); await run;
  assert.equal(posts, 1); assert.equal(coordinator.snapshot("mounted")?.status, "completed"); assert.equal(coordinator.snapshot("mounted")?.content, "Canonical"); assert.equal(states.at(-1), "completed");
});

test("a Chat subscription registered before submit receives the complete generation lifecycle", async () => {
  const coordinator = new ConversationGenerationCoordinator(); const states: string[] = []; coordinator.subscribe("pre-mounted", (snapshot) => states.push(`${snapshot.status}:${snapshot.content}`));
  await coordinator.start("pre-mounted", "Prompt", async (onEvent) => { onEvent({ type: "started", requestId: "request-1" }); onEvent({ type: "delta", requestId: "request-1", content: "Part" }); onEvent({ type: "completed", requestId: "request-1", reply: "Complete", assistantMessage: { id: "assistant-1", content: "Complete" } }); });
  assert.deepEqual(states, ["processing:", "processing:", "streaming:Part", "completed:Complete"]); assert.equal(coordinator.snapshot("pre-mounted")?.requestId, "request-1");
});

test("external-store subscribers receive verified action completion while Chat stays mounted", async () => {
  const coordinator = new ConversationGenerationCoordinator(); const states: string[] = [];
  const unsubscribe = coordinator.subscribeChanges("action", () => states.push(`${coordinator.snapshot("action")?.status}:${coordinator.snapshot("action")?.content}`));
  await coordinator.start("action", "Create an unpublished draft", async (onEvent) => {
    onEvent({ type: "started", requestId: "action-request" });
    onEvent({ type: "completed", requestId: "action-request", reply: "Draft created", assistantMessage: { id: "assistant-action", content: "Draft created" }, action: { actionId: "action-request:blog.draft.create", status: "completed", verificationStatus: "passed", draftId: "draft-1" } });
  });
  unsubscribe();
  assert.deepEqual(states, ["processing:", "processing:", "completed:Draft created"]);
  assert.equal(coordinator.snapshot("action")?.completion?.assistantMessage.id, "assistant-action");
});

test("registry external-store snapshot is stable between publications and drives spinner terminal state", async () => {
  const coordinator = new ConversationGenerationCoordinator(); const snapshots: readonly unknown[][] = []; let release!: () => void;
  const unsubscribe = coordinator.subscribeRegistryChanges(() => snapshots.push(coordinator.snapshots()));
  const run = coordinator.start("spinner", "Prompt", async (onEvent) => { onEvent({ type: "delta", content: "Working" }); await new Promise<void>((resolve) => { release = resolve; }); onEvent({ type: "completed", reply: "Done", assistantMessage: { id: "done", content: "Done" } }); });
  assert.equal(coordinator.snapshots(), coordinator.snapshots());
  assert.equal(coordinator.isActive("spinner"), true);
  release(); await run; unsubscribe();
  assert.equal(coordinator.isActive("spinner"), false);
  assert.equal((snapshots.at(-1)?.[0] as { status: string }).status, "completed");
});

test("route-independent registry activity starts and stops without visiting Chat", async () => {
  const coordinator = new ConversationGenerationCoordinator(); const active: string[][] = []; coordinator.subscribeAll((snapshots) => active.push(snapshots.filter((item) => item.status === "processing" || item.status === "streaming").map((item) => item.conversationId)));
  let finish!: () => void; const gate = new Promise<void>((resolve) => { finish = resolve; }); const run = coordinator.start("sidebar", "Prompt", async (onEvent) => { onEvent({ type: "delta", content: "Part" }); await gate; onEvent({ type: "completed", reply: "Done", assistantMessage: { id: "assistant-sidebar", content: "Done" } }); });
  assert.deepEqual(active.at(-1), ["sidebar"]); finish(); await run; assert.deepEqual(active.at(-1), []); assert.equal(coordinator.snapshot("sidebar")?.status, "completed");
});

test("failed timed-out and cancelled generations are terminal and clear registry activity", async () => {
  for (const [code, expected] of [["PROVIDER_FAILED", "failed"], ["PROVIDER_TIMEOUT", "timed_out"], ["REQUEST_CANCELLED", "cancelled"]] as const) { const coordinator = new ConversationGenerationCoordinator(); const active: number[] = []; coordinator.subscribeAll((items) => active.push(items.filter((item) => item.status === "processing" || item.status === "streaming").length)); await coordinator.start(code, "Prompt", async (onEvent) => { onEvent({ type: "interrupted", code, message: "Stopped" }); }); assert.equal(coordinator.snapshot(code)?.status, expected); assert.equal(active.at(-1), 0); }
});

test("conversation subscriptions and buffered state remain isolated", async () => {
  const coordinator = new ConversationGenerationCoordinator(); const first: string[] = []; const second: string[] = []; coordinator.subscribe("first", (snapshot) => first.push(snapshot.content)); coordinator.subscribe("second", (snapshot) => second.push(snapshot.content));
  await coordinator.start("first", "First prompt", async (onEvent) => { onEvent({ type: "delta", content: "First only" }); });
  assert.deepEqual(first, ["", "First only", "First only"]); assert.deepEqual(second, []); assert.equal(coordinator.snapshot("second"), undefined); assert.equal(coordinator.snapshot("first")?.status, "awaiting_persistence");
});

test("a dropped terminal event recovers from persisted completion with GET-only reconciliation", async () => {
  const coordinator = new ConversationGenerationCoordinator(); let posts = 0; let gets = 0;
  void coordinator.start("dropped", "Prompt", async (onEvent) => { posts += 1; onEvent({ type: "delta", content: "Partial" }); await new Promise(() => undefined); });
  const recovered = await coordinator.reconcileUntilTerminal("dropped", async () => { gets += 1; return [{ id: "user-dropped", role: "user", content: "Prompt", generationStatus: "completed" }, { id: "assistant-dropped", role: "assistant", content: "Persisted canonical", generationStatus: "completed" }]; }, { maxAttempts: 2, wait: async () => undefined });
  assert.equal(recovered, true); assert.equal(posts, 1); assert.equal(gets, 1); assert.equal(coordinator.snapshot("dropped")?.status, "completed"); assert.equal(coordinator.snapshot("dropped")?.completion?.assistantMessage.id, "assistant-dropped");
});

test("persistence reconciliation is bounded, never submits again, and settles recovery exhaustion", async () => {
  const coordinator = new ConversationGenerationCoordinator(); let posts = 0; let gets = 0;
  void coordinator.start("bounded", "Prompt", async () => { posts += 1; await new Promise(() => undefined); });
  const recovered = await coordinator.reconcileUntilTerminal("bounded", async () => { gets += 1; return []; }, { maxAttempts: 3, wait: async () => undefined });
  assert.equal(recovered, false); assert.equal(gets, 3); assert.equal(posts, 1); assert.equal(coordinator.isActive("bounded"), false); assert.equal(coordinator.snapshot("bounded")?.status, "failed"); assert.equal(coordinator.snapshot("bounded")?.terminalReason, "transport_recovery_exhausted");
});

test("stale stream events and rejection cannot overwrite a persisted terminal completion", async () => {
  const coordinator = new ConversationGenerationCoordinator(); let emit!: (event: ConversationGenerationEvent) => void; let reject!: (reason?: unknown) => void;
  const run = coordinator.start("ordered", "Prompt", (onEvent) => { emit = onEvent; return new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }); });
  emit({ type: "delta", content: "Stale partial" });
  assert.equal(coordinator.reconcilePersistedMessages("ordered", [{ id: "user-ordered", role: "user", content: "Prompt", generationStatus: "completed" }, { id: "assistant-ordered", role: "assistant", content: "Persisted first", generationStatus: "completed" }]), true);
  emit({ type: "delta", content: "Late stale delta" }); reject(new Error("late stream close")); await run;
  assert.equal(coordinator.snapshot("ordered")?.status, "completed"); assert.equal(coordinator.snapshot("ordered")?.content, "Persisted first");
});

test("stale streaming before persistence produces one canonical assistant message", () => {
  const user = { id: "user", role: "user" as const, content: "Prompt" }; const stale = { id: "stream-conversation", role: "assistant" as const, content: "Partial", streaming: true }; const canonical = { id: "assistant", role: "assistant" as const, content: "Canonical" };
  const completed = mergeStreamCompletion(mergeStreamDelta([user], stale), canonical); const replayed = mergeStreamCompletion(completed, canonical);
  assert.deepEqual(completed, [user, canonical]); assert.deepEqual(replayed, [user, canonical]); assert.equal(replayed.filter((item) => item.role === "assistant").length, 1);
});

test("persisted hydration cannot overwrite a terminal registry completion", async () => {
  const coordinator = new ConversationGenerationCoordinator();
  await coordinator.start("hydrate", "Prompt", async (onEvent) => onEvent({ type: "completed", reply: "Canonical", assistantMessage: { id: "assistant-canonical", content: "Canonical" } }));
  const stale = [{ id: "user", role: "user" as const, content: "Prompt" }];
  const merged = mergePersistedTerminal(stale, coordinator.snapshot("hydrate"), (completion) => ({ id: completion.assistantMessage.id, role: "assistant" as const, content: completion.assistantMessage.content }));
  assert.deepEqual(merged, [stale[0], { id: "assistant-canonical", role: "assistant", content: "Canonical" }]);
  assert.equal(merged.filter((item) => item.role === "assistant").length, 1);
});

test("privacy-safe lifecycle diagnostics expose terminal delivery and subscriber transition", async () => {
  const diagnostics: Array<Record<string, unknown>> = []; const coordinator = new ConversationGenerationCoordinator((item) => diagnostics.push(item));
  const unsubscribe = coordinator.subscribeChanges("diagnostic", () => undefined);
  await coordinator.start("diagnostic", "private prompt must not be logged", async (onEvent) => { onEvent({ type: "started", requestId: "request-safe" }); onEvent({ type: "completed", requestId: "request-safe", reply: "private response", assistantMessage: { id: "assistant", content: "private response" } }); });
  unsubscribe(); const serialized = JSON.stringify(diagnostics);
  assert.match(serialized, /terminal_stream_event/); assert.match(serialized, /subscriber_notification/); assert.match(serialized, /request-safe/); assert.doesNotMatch(serialized, /private prompt|private response/);
});

test("diagnostics prove local stream failure remains recoverable until the bounded terminal rule", async () => {
  const diagnostics: Array<Record<string, unknown>> = []; const coordinator = new ConversationGenerationCoordinator((item) => diagnostics.push(item));
  await coordinator.start("failed-recovery", "private", async () => { throw new Error("transport closed"); });
  const recovered = await coordinator.reconcileUntilTerminal("failed-recovery", async () => [], { maxAttempts: 1, wait: async () => undefined });
  assert.equal(recovered, false); assert.ok(diagnostics.some((item) => item.event === "terminal_stream_event" && item.terminalReceived === false)); assert.ok(diagnostics.some((item) => item.event === "registry_transition" && item.toStatus === "awaiting_persistence")); assert.ok(diagnostics.some((item) => item.event === "reconciliation" && item.reason === "attempt_limit_reached" && item.localFailureStoppedRecovery === false));
});

test("transport failure recovers persisted success without navigation, refresh, or a second POST", async () => {
  const coordinator = new ConversationGenerationCoordinator(); let posts = 0; let gets = 0; const states: string[] = [];
  coordinator.subscribeChanges("recover-success", () => states.push(coordinator.snapshot("recover-success")?.status ?? "missing"));
  await coordinator.start("recover-success", "Prompt", async (onEvent) => { posts += 1; onEvent({ type: "started", requestId: "recover-request" }); throw new Error("network lost"); });
  assert.equal(coordinator.snapshot("recover-success")?.status, "awaiting_persistence"); assert.equal(coordinator.isActive("recover-success"), true);
  const recovered = await coordinator.reconcileUntilTerminal("recover-success", async () => { gets += 1; return gets === 1 ? [] : [{ id: "user", role: "user", content: "Prompt", generationStatus: "completed" }, { id: "assistant", role: "assistant", content: "Canonical", generationStatus: "completed" }]; }, { maxAttempts: 2, wait: async () => undefined });
  assert.equal(recovered, true); assert.equal(posts, 1); assert.equal(gets, 2); assert.equal(states.at(-1), "completed"); assert.equal(coordinator.snapshot("recover-success")?.completion?.assistantMessage.id, "assistant");
  const rendered = mergeStreamCompletion([{ id: "user", role: "user" as const, content: "Prompt" }], { id: "assistant", role: "assistant" as const, content: "Canonical" }); assert.equal(rendered.filter((item) => item.role === "assistant").length, 1);
});

test("transport failure recovers an authoritative persisted backend failure", async () => {
  const coordinator = new ConversationGenerationCoordinator(); const activity: boolean[] = []; coordinator.subscribeRegistryChanges(() => activity.push(coordinator.isActive("recover-failure")));
  await coordinator.start("recover-failure", "Prompt", async () => { throw new Error("network lost"); }); assert.equal(activity.at(-1), true);
  const recovered = await coordinator.reconcileUntilTerminal("recover-failure", async () => [{ id: "user", role: "user", content: "Prompt", generationStatus: "completed" }, { id: "assistant-failed", role: "assistant", content: "Backend interrupted", generationStatus: "interrupted" }], { maxAttempts: 1, wait: async () => undefined });
  assert.equal(recovered, false); assert.equal(coordinator.snapshot("recover-failure")?.status, "failed"); assert.equal(coordinator.snapshot("recover-failure")?.terminalReason, "backend_interrupted"); assert.equal(activity.at(-1), false);
});

test("assistant activity presentation remains visible throughout every non-terminal state", () => {
  const snapshot = (status: ConversationGenerationSnapshot["status"], content = ""): ConversationGenerationSnapshot => ({ conversationId: "activity", prompt: "Prompt", status, content });
  assert.deepEqual(assistantActivityPresentation(undefined, "sending"), { kind: "working" });
  const processing = snapshot("processing"); assert.deepEqual(assistantActivityPresentation(processing, "completed"), { kind: "working" });
  for (let simulatedSeconds = 0; simulatedSeconds <= 35; simulatedSeconds += 5) assert.deepEqual(assistantActivityPresentation(processing, "idle"), { kind: "working" });
  assert.deepEqual(assistantActivityPresentation(snapshot("streaming", "Buffered text"), "idle"), { kind: "streaming", content: "Buffered text" });
  assert.deepEqual(assistantActivityPresentation(snapshot("awaiting_persistence"), "idle"), { kind: "reconnecting" });
  assert.deepEqual(assistantActivityPresentation(snapshot("awaiting_persistence", "Buffered text"), "idle"), { kind: "reconnecting", content: "Buffered text" });
  assert.equal(assistantActivityPresentation(snapshot("completed"), "processing"), null);
  assert.deepEqual(assistantActivityPresentation({ ...snapshot("failed"), terminalReason: "transport_recovery_exhausted" }, "processing"), { kind: "terminal_failure" });
});

test("hydration and remount restore exactly one registry-owned working presentation", async () => {
  const coordinator = new ConversationGenerationCoordinator(); let posts = 0;
  void coordinator.start("remount-working", "Prompt", async () => { posts += 1; await new Promise(() => undefined); });
  const before = assistantActivityPresentation(coordinator.snapshot("remount-working"), "idle");
  const persisted = [{ id: "user", role: "user" as const, content: "Prompt", generationStatus: "completed" as const }]; coordinator.reconcilePersistedMessages("remount-working", persisted);
  const afterHydration = assistantActivityPresentation(coordinator.snapshot("remount-working"), "idle");
  const afterRemount = assistantActivityPresentation(coordinator.snapshot("remount-working"), "idle");
  assert.deepEqual(before, { kind: "working" }); assert.deepEqual(afterHydration, { kind: "working" }); assert.deepEqual(afterRemount, { kind: "working" }); assert.equal(posts, 1);
});
