export function isActiveSendConversationActivation(createdConversationId: string, nextConversationId: string | undefined) {
  return Boolean(createdConversationId && nextConversationId === createdConversationId);
}

export function transcriptScopeKey(conversationId: string | undefined, workspaceId: string | undefined) {
  return conversationId ? `conversation:${conversationId}` : `workspace:${workspaceId ?? "general"}`;
}

export function refreshConversationList(refresh: () => Promise<void>) {
  void refresh().catch(() => undefined);
}

export function formatMessageTime(value: unknown, locale?: string, timeZone?: string) {
  let date: Date | null = null;
  if (typeof value === "string" || typeof value === "number") date = new Date(value);
  else if (value && typeof value === "object") {
    const record = value as { _seconds?: unknown; seconds?: unknown };
    const seconds = typeof record._seconds === "number" ? record._seconds : typeof record.seconds === "number" ? record.seconds : null;
    if (seconds !== null) date = new Date(seconds * 1000);
  }
  return date && !Number.isNaN(date.valueOf()) ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", ...(timeZone ? { timeZone } : {}) }).format(date) : "";
}

export function retainedConversationId(currentId: string, authorizedIds: readonly string[]) {
  return currentId && authorizedIds.includes(currentId) ? currentId : "";
}

export function isNearChatBottom(scrollTop: number, clientHeight: number, scrollHeight: number, threshold = 120) {
  return scrollHeight - scrollTop - clientHeight <= threshold;
}

export type StreamMessage = { id: string; role: "user" | "assistant"; content: string; streaming?: boolean };
export function mergeStreamDelta<T extends StreamMessage>(messages: T[], message: T): T[] {
  const last = messages.at(-1);
  return last?.role === "assistant" && last.streaming
    ? messages.map((item, index) => index === messages.length - 1 ? { ...item, content: item.content + message.content } : item)
    : [...messages, message];
}
export function mergeStreamCompletion<T extends StreamMessage>(messages: T[], canonical: T): T[] {
  const canonicalIndex = messages.findIndex((item) => item.id === canonical.id);
  if (canonicalIndex >= 0) return messages.map((item, index) => index === canonicalIndex ? canonical : item);
  const last = messages.at(-1);
  return last?.role === "assistant" && last.streaming
    ? messages.map((item, index) => index === messages.length - 1 ? canonical : item)
    : [...messages, canonical];
}
export function mergePersistedTerminal<T extends StreamMessage>(messages: T[], snapshot: ConversationGenerationSnapshot | undefined, canonical: (completion: Extract<ConversationGenerationEvent, { type: "completed" }>) => T): T[] {
  return snapshot?.status === "completed" && snapshot.completion ? mergeStreamCompletion(messages, canonical(snapshot.completion)) : messages;
}

export type ConversationGenerationEvent =
  | { type: "started"; requestId?: string }
  | { type: "delta"; content: string; requestId?: string }
  | { type: "action_status"; action: unknown; assistantMessage: { id: string; content: string; citations?: unknown[] }; requestId?: string }
  | { type: "completed"; reply: string; assistantMessage: { id: string; content: string; citations?: unknown[] }; businessOsStatus?: "ready" | "empty" | "uninitialized"; action?: unknown; requestId?: string }
  | { type: "interrupted"; code: string; message: string; requestId?: string };
export type ConversationGenerationStatus = "idle" | "processing" | "streaming" | "applying" | "verifying" | "awaiting_persistence" | "completed" | "failed" | "timed_out" | "cancelled";
export type ConversationGenerationSnapshot = { conversationId: string; prompt: string; requestId?: string; status: ConversationGenerationStatus; content: string; actionState?: Extract<ConversationGenerationEvent, { type: "action_status" }>; completion?: Extract<ConversationGenerationEvent, { type: "completed" }>; terminalReason?: "backend_interrupted" | "transport_recovery_exhausted" };
export type AssistantActivityPresentation = { kind: "working" | "streaming" | "reconnecting" | "terminal_failure"; content?: string } | null;
export function assistantActivityPresentation(snapshot: ConversationGenerationSnapshot | undefined, localStatus: "idle" | "sending" | "processing" | "streaming" | "completed" | "failed"): AssistantActivityPresentation {
  if (snapshot?.status === "processing") return { kind: "working" };
  if (snapshot?.status === "applying" || snapshot?.status === "verifying") return null;
  if (snapshot?.status === "streaming") return snapshot.content ? { kind: "streaming", content: snapshot.content } : { kind: "working" };
  if (snapshot?.status === "awaiting_persistence") return { kind: "reconnecting", ...(snapshot.content ? { content: snapshot.content } : {}) };
  if (snapshot?.status === "failed" && snapshot.terminalReason) return { kind: "terminal_failure", ...(snapshot.content ? { content: snapshot.content } : {}) };
  if (snapshot) return null;
  if (localStatus === "sending" || localStatus === "processing") return { kind: "working" };
  return null;
}
export type FrontendLifecycleDiagnostic = { event: "terminal_stream_event" | "registry_transition" | "subscriber_notification" | "reconciliation"; conversationId: string; requestId?: string; status?: ConversationGenerationStatus; fromStatus?: ConversationGenerationStatus; toStatus?: ConversationGenerationStatus; terminalReceived?: boolean; listenerCount?: number; reason?: string; localFailureStoppedRecovery?: boolean };
export type FrontendLifecycleDiagnosticSink = (diagnostic: FrontendLifecycleDiagnostic) => void;

export class ConversationGenerationCoordinator {
  private readonly active = new Map<string, { snapshot: ConversationGenerationSnapshot; promise: Promise<void>; baselineMessageIds: ReadonlySet<string> }>();
  private readonly listeners = new Map<string, Set<(snapshot: ConversationGenerationSnapshot) => void>>();
  private readonly registryListeners = new Set<(snapshots: ConversationGenerationSnapshot[]) => void>();
  private readonly reconciliation = new Map<string, Promise<boolean>>();
  private registrySnapshot: ConversationGenerationSnapshot[] = [];
  private readonly diagnostic: FrontendLifecycleDiagnosticSink;
  constructor(diagnostic: FrontendLifecycleDiagnosticSink = () => undefined) { this.diagnostic = diagnostic; }
  private recoverable(status: ConversationGenerationStatus) { return status === "processing" || status === "streaming" || status === "applying" || status === "verifying" || status === "awaiting_persistence"; }
  start(conversationId: string, prompt: string, run: (onEvent: (event: ConversationGenerationEvent) => void) => Promise<unknown>, options: { knownPersistedMessageIds?: Iterable<string> } = {}) {
    const existing = this.active.get(conversationId); if (existing && this.recoverable(existing.snapshot.status)) return existing.promise; if (existing) this.active.delete(conversationId);
    const entry = { snapshot: { conversationId, prompt, status: "processing", content: "" } as ConversationGenerationSnapshot, promise: Promise.resolve(), baselineMessageIds: new Set(options.knownPersistedMessageIds) };
    const terminal = () => !this.recoverable(entry.snapshot.status);
    const interruptedStatus = (code: string): ConversationGenerationStatus => /TIMEOUT/i.test(code) ? "timed_out" : /CANCEL|ABORT/i.test(code) ? "cancelled" : "failed";
    this.active.set(conversationId, entry); this.publish(entry, entry.snapshot);
    entry.promise = run((event) => { if (terminal()) return; const requestId = event.requestId ?? entry.snapshot.requestId; if (event.type === "started") this.publish(entry, { ...entry.snapshot, requestId, status: "processing" }); else if (event.type === "delta") this.publish(entry, { ...entry.snapshot, requestId, status: "streaming", content: entry.snapshot.content + event.content }); else if (event.type === "action_status") { const action = event.action as { status?: string }; const status = action.status === "verifying" ? "verifying" : "applying"; this.publish(entry, { ...entry.snapshot, requestId, status, content: event.assistantMessage.content, actionState: event }); } else if (event.type === "completed") { this.diagnostic({ event: "terminal_stream_event", conversationId, requestId, status: "completed", terminalReceived: true }); this.publish(entry, { conversationId, prompt, requestId, status: "completed", content: event.assistantMessage.content, completion: event }); } else this.publish(entry, { ...entry.snapshot, requestId, status: interruptedStatus(event.code), terminalReason: "backend_interrupted" }); }).then(() => { if (!terminal()) { this.diagnostic({ event: "terminal_stream_event", conversationId, requestId: entry.snapshot.requestId, status: entry.snapshot.status, terminalReceived: false, reason: "stream_resolved_without_terminal" }); this.publish(entry, { ...entry.snapshot, status: "awaiting_persistence" }); } }, (caught) => { if (!terminal()) { this.diagnostic({ event: "terminal_stream_event", conversationId, requestId: entry.snapshot.requestId, status: entry.snapshot.status, terminalReceived: false, reason: caught instanceof DOMException && caught.name === "AbortError" ? "stream_aborted_before_terminal" : "stream_failed_before_terminal" }); this.publish(entry, { ...entry.snapshot, status: "awaiting_persistence" }); } });
    return entry.promise;
  }
  private publish(entry: { snapshot: ConversationGenerationSnapshot }, snapshot: ConversationGenerationSnapshot) { const fromStatus = entry.snapshot.status; entry.snapshot = snapshot; this.registrySnapshot = [...this.active.values()].map((item) => item.snapshot); this.diagnostic({ event: "registry_transition", conversationId: snapshot.conversationId, requestId: snapshot.requestId, fromStatus, toStatus: snapshot.status }); const conversationListeners = this.listeners.get(snapshot.conversationId) ?? new Set<(snapshot: ConversationGenerationSnapshot) => void>(); for (const listener of conversationListeners) listener(snapshot); this.diagnostic({ event: "subscriber_notification", conversationId: snapshot.conversationId, requestId: snapshot.requestId, status: snapshot.status, listenerCount: conversationListeners.size }); for (const listener of this.registryListeners) listener(this.registrySnapshot); }
  subscribe(conversationId: string, listener: (snapshot: ConversationGenerationSnapshot) => void) { let listeners = this.listeners.get(conversationId); if (!listeners) { listeners = new Set(); this.listeners.set(conversationId, listeners); } listeners.add(listener); const entry = this.active.get(conversationId); if (entry) listener(entry.snapshot); return () => { listeners?.delete(listener); if (!listeners?.size) this.listeners.delete(conversationId); }; }
  subscribeChanges(conversationId: string, listener: () => void) { let listeners = this.listeners.get(conversationId); if (!listeners) { listeners = new Set(); this.listeners.set(conversationId, listeners); } const wrapped = () => listener(); listeners.add(wrapped); return () => { listeners?.delete(wrapped); if (!listeners?.size) this.listeners.delete(conversationId); }; }
  subscribeAll(listener: (snapshots: ConversationGenerationSnapshot[]) => void) { this.registryListeners.add(listener); listener(this.snapshots()); return () => { this.registryListeners.delete(listener); }; }
  subscribeRegistryChanges(listener: () => void) { const wrapped = () => listener(); this.registryListeners.add(wrapped); return () => { this.registryListeners.delete(wrapped); }; }
  snapshots() { return this.registrySnapshot; }
  snapshot(conversationId: string) { return this.active.get(conversationId)?.snapshot; }
  isActive(conversationId: string) { const status = this.snapshot(conversationId)?.status; return status ? this.recoverable(status) : false; }
  reconcilePersistedCompletion(conversationId: string, prompt: string, completion: Extract<ConversationGenerationEvent, { type: "completed" }>) { const entry = this.active.get(conversationId); if (!entry || !this.recoverable(entry.snapshot.status) || entry.snapshot.prompt !== prompt) return false; this.publish(entry, { conversationId, prompt, requestId: entry.snapshot.requestId, status: "completed", content: completion.assistantMessage.content, completion }); return true; }
  reconcilePersistedMessages(conversationId: string, messages: readonly { id: string; role: "user" | "assistant"; content: string; generationStatus?: "processing" | "completed" | "interrupted"; citations?: unknown[]; action?: unknown }[]) { const entry = this.active.get(conversationId); const snapshot = entry?.snapshot; if (!entry || !snapshot || !this.recoverable(snapshot.status)) return false; let promptIndex = -1; for (let index = messages.length - 1; index >= 0; index -= 1) if (messages[index].role === "user" && messages[index].content === snapshot.prompt) { promptIndex = index; break; } if (promptIndex < 0) return false; const afterPrompt = messages.slice(promptIndex + 1).filter((item) => item.role === "assistant" && !entry.baselineMessageIds.has(item.id)); const progress = afterPrompt.findLast((item) => item.generationStatus === "processing" && item.action); if (progress) { const status = (progress.action as { status?: string }).status === "verifying" ? "verifying" : "applying"; this.publish(entry, { ...entry.snapshot, status, content: progress.content, actionState: { type: "action_status", action: progress.action, assistantMessage: { id: progress.id, content: progress.content, citations: progress.citations } } }); } const assistant = afterPrompt.find((item) => item.generationStatus === "completed" || item.generationStatus === "interrupted"); if (!assistant) return false; if (assistant.generationStatus === "interrupted") { if (!this.recoverable(entry.snapshot.status)) return false; this.publish(entry, { ...entry.snapshot, status: "failed", content: assistant.content, terminalReason: "backend_interrupted" }); return true; } return this.reconcilePersistedCompletion(conversationId, snapshot.prompt, { type: "completed", reply: assistant.content, assistantMessage: { id: assistant.id, content: assistant.content, citations: assistant.citations }, action: assistant.action }); }
  reconcileUntilTerminal(conversationId: string, load: () => Promise<readonly { id: string; role: "user" | "assistant"; content: string; generationStatus?: "processing" | "completed" | "interrupted"; citations?: unknown[]; action?: unknown }[]>, options: { maxAttempts?: number; wait?: () => Promise<void> } = {}) {
    const existing = this.reconciliation.get(conversationId); if (existing) return existing;
    const maxAttempts = options.maxAttempts ?? 160; const wait = options.wait ?? (() => new Promise<void>((resolve) => globalThis.setTimeout(resolve, 750)));
    this.diagnostic({ event: "reconciliation", conversationId, requestId: this.snapshot(conversationId)?.requestId, status: this.snapshot(conversationId)?.status, reason: "started" });
    const operation = Promise.resolve().then(async () => { for (let attempt = 0; attempt < maxAttempts; attempt += 1) { if (!this.isActive(conversationId)) { const status = this.snapshot(conversationId)?.status; this.diagnostic({ event: "reconciliation", conversationId, requestId: this.snapshot(conversationId)?.requestId, status, reason: status === "completed" ? "terminal_completed" : "authoritative_terminal" }); return status === "completed"; } if (attempt > 0) await wait(); if (!this.isActive(conversationId)) { const status = this.snapshot(conversationId)?.status; this.diagnostic({ event: "reconciliation", conversationId, requestId: this.snapshot(conversationId)?.requestId, status, reason: status === "completed" ? "terminal_completed" : "authoritative_terminal" }); return status === "completed"; } try { if (this.reconcilePersistedMessages(conversationId, await load())) { const status = this.snapshot(conversationId)?.status; this.diagnostic({ event: "reconciliation", conversationId, requestId: this.snapshot(conversationId)?.requestId, status, reason: status === "completed" ? "persisted_completion_found" : "persisted_failure_found" }); return status === "completed"; } } catch { /* persistence remains retryable within the recovery bound */ } } const entry = this.active.get(conversationId); if (entry && this.recoverable(entry.snapshot.status)) this.publish(entry, { ...entry.snapshot, status: "failed", terminalReason: "transport_recovery_exhausted" }); this.diagnostic({ event: "reconciliation", conversationId, requestId: this.snapshot(conversationId)?.requestId, status: this.snapshot(conversationId)?.status, reason: "attempt_limit_reached", localFailureStoppedRecovery: false }); return false; }).finally(() => { if (this.reconciliation.get(conversationId) === operation) this.reconciliation.delete(conversationId); });
    this.reconciliation.set(conversationId, operation); return operation;
  }
}

function temporaryLifecycleDiagnostic(diagnostic: FrontendLifecycleDiagnostic) { console.info("[emmy-lifecycle]", JSON.stringify(diagnostic)); }
export const conversationGenerations = new ConversationGenerationCoordinator(temporaryLifecycleDiagnostic);
