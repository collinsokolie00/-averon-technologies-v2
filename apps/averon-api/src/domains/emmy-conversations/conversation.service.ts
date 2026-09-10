import type { BusinessOsCitation, EmmyActionMetadata, EmmyConversation, EmmyConversationMessage } from "@averon/shared-types";
import { ApiError } from "../../errors/api-error.ts";
import type { AuthContext } from "../../services/auth/authentication.ts";
import type { WorkspaceAuthorizationService } from "../workspaces/workspace.service.ts";
import type { EmmyService } from "../../ai/emmy/emmy.service.ts";
import type { PrivateEmmyService } from "../../ai/emmy/private-emmy.ts";
import { parseEmmyInput } from "../../ai/emmy/emmy.schemas.ts";
import type { ConversationRepository } from "./conversation.types.ts";
import type { WorkspaceNotificationService } from "../workspace-notifications/workspace-notification.service.ts";
import type { DiagnosticsStore } from "../../ai/diagnostics/diagnostics.store.ts";

function validId(value: string) { return /^[A-Za-z0-9_-]{1,128}$/.test(value); }
function titleFrom(message: string) { const clean = message.replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim(); const words = clean.split(" ").slice(0, 6).join(" "); return (words || "New conversation").slice(0, 56); }
function boundedHistory(messages: Awaited<ReturnType<ConversationRepository["listMessages"]>>) { return messages.slice(-8).map(({ role, content }) => ({ role, content: content.trim().slice(0, 900) })); }
function isOperationalFollowUp(message: string) { return /\b(?:did\s+you|have\s+you|are\s+you\s+(?:really\s+)?sure|actually|what\s+(?:did\s+you\s+)?change|last\s+(?:thing|change)|verification|verified|deploy(?:ed|ment)?|roll(?:ed)?\s*back|proposal|appl(?:y|ied))\b/i.test(message); }
function operationalReply(action: EmmyActionMetadata) {
  const source = action.actionType.startsWith("frontend.source.") || action.actionType.startsWith("backend.source.");
  const noOp = action.warnings.some((warning) => /ALREADY_SATISFIED|no change|idempotent/i.test(warning));
  const rolledBack = source && "rollbackStatus" in action && action.rollbackStatus === "completed";
  if (rolledBack) return `The authoritative action record shows the operation failed and its source change was rolled back.\n\n- Action: ${action.actionType}\n- Status: Rolled back\n- Verification: ${action.verificationStatus}\n- Deployment: Not performed`;
  if (noOp) return `The authoritative action record shows no change was required.\n\n- Action: ${action.actionType}\n- Status: No change required\n- Verification: ${action.verificationStatus}\n${source ? "- Deployment: Not performed" : ""}`.trim();
  if (action.status === "approval_required" || action.status === "proposed" || ("approvalStatus" in action && action.approvalStatus === "pending")) return `The authoritative action record shows a proposal was prepared, but it has not been applied.\n\n- Action: ${action.actionType}\n- Status: Awaiting approval\n- Action ID: ${action.actionId}\n${source ? "- Deployment: Not performed" : ""}`.trim();
  if (action.status === "failed" || action.status === "cancelled" || action.status === "rejected") return `The authoritative action record shows the operation did not complete.\n\n- Action: ${action.actionType}\n- Status: ${action.status === "rejected" ? "Rejected" : action.status === "cancelled" ? "Cancelled" : "Failed"}\n- Verification: ${action.verificationStatus}\n${source ? "- Deployment: Not performed" : ""}`.trim();
  if (action.status === "completed" && action.verificationStatus === "passed") return `Yes. The authoritative action record confirms the operation completed and verification passed.\n\n- Action: ${action.actionType}\n- Action ID: ${action.actionId}\n- Verification: Passed\n${source ? "- Deployment: Not performed" : ""}`.trim();
  return `The authoritative action record does not yet prove completion.\n\n- Action: ${action.actionType}\n- Status: ${action.status}\n- Verification: ${action.verificationStatus}`;
}
function truthfulActionReply(reply: string, action?: EmmyActionMetadata) {
  const verb = "(?:applied|changed|created|published|deleted|verified|rolled\\s+back|deployed)";
  const operationalClaim = [
    new RegExp(`\\bI\\s+(?:have\\s+)?(?:successfully\\s+)?${verb}\\b`, "i"),
    new RegExp(`\\b(?:was|were|has\\s+been|have\\s+been)\\s+(?:successfully\\s+)?${verb}\\b`, "i"),
    new RegExp(`(?:^|[.!?]\\s+)${verb}(?:\\s+successfully)?(?=[.!?:]|$)`, "i"),
  ].some((pattern) => pattern.test(reply));
  if (!operationalClaim) return reply;
  if (!action) return "I do not have an authoritative completed action record supporting that claim.";
  return operationalReply(action);
}
function actionProgressReply(action: EmmyActionMetadata) { return action.status === "applying" ? "Applying the approved operation…" : action.status === "verifying" ? "The mutation completed. Running validation and read-back verification…" : operationalReply(action); }

export class ConversationService {
  private readonly repository: ConversationRepository; private readonly workspaces: WorkspaceAuthorizationService; private readonly generalEmmy: EmmyService; private readonly privateEmmy: PrivateEmmyService; private notifications?: WorkspaceNotificationService; private diagnostics?: DiagnosticsStore;
  constructor(repository: ConversationRepository, workspaces: WorkspaceAuthorizationService, generalEmmy: EmmyService, privateEmmy: PrivateEmmyService, notifications?: WorkspaceNotificationService, diagnostics?: DiagnosticsStore) { this.repository = repository; this.workspaces = workspaces; this.generalEmmy = generalEmmy; this.privateEmmy = privateEmmy; this.notifications = notifications; this.diagnostics = diagnostics; }
  setNotificationService(service: WorkspaceNotificationService) { this.notifications = service; }
  setDiagnosticsStore(store: DiagnosticsStore) { this.diagnostics = store; }
  private async recordOperation(auth: AuthContext, workspaceId: string, requestId: string | undefined, action?: EmmyActionMetadata) { if (!requestId || !action || !this.diagnostics?.recordOperation) return; const context = await this.workspaces.resolve(auth, workspaceId); await this.diagnostics.recordOperation(requestId, action, { workspaceId, businessId: context.business.id }); }
  private async notifyTerminalAction(auth: AuthContext, workspaceId: string, action?: EmmyActionMetadata) { if (!action || !this.notifications || !["completed", "failed", "rejected", "cancelled"].includes(action.status)) return; const context = await this.workspaces.resolve(auth, workspaceId); const successful = action.status === "completed" && action.verificationStatus === "passed"; await this.notifications.record({ notificationId: `action-${action.actionId.replace(/[^A-Za-z0-9_-]/g, "_")}`, workspaceId, businessId: context.business.id, category: "ACTION_RESULT", severity: successful ? "success" : "warning", title: successful ? "Authorized action completed" : "Authorized action requires attention", message: `${action.actionType} ${successful ? "completed and verification passed" : `settled as ${action.status}`}.`, source: "emmy.authorized_action", relatedEntityId: action.actionId, authoritativeStatus: successful ? "completed" : "failed", destination: { kind: "internal", path: "/chat", label: "Open conversation" } }); }
  private async own(auth: AuthContext, id: string) {
    if (!validId(id)) throw new ApiError(400, "INVALID_CONVERSATION_ID", "Conversation ID is invalid.");
    const item = await this.repository.get(id); if (!item || item.userId !== auth.user.userId) throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation was not found.");
    if (item.workspaceId) await this.workspaces.requirePermission(auth, item.workspaceId, "emmy:use");
    return item;
  }
  private async latestOperationalAction(auth: AuthContext, workspaceId: string, message: string) {
    const explicitId = message.match(/\b([A-Za-z0-9][A-Za-z0-9:._-]{7,180}:(?:frontend|backend)\.source\.(?:propose|apply))\b/i)?.[1];
    const scope = /\bbackend\b/i.test(message) ? "backend.source." : /\bfrontend\b/i.test(message) ? "frontend.source." : /\b(?:blog|draft)\b/i.test(message) ? "blog.draft." : /\bseo|metadata\b/i.test(message) ? "seo.metadata." : /\bpage|homepage|content\b/i.test(message) ? "page.content." : "";
    const conversations = (await this.repository.list(auth.user.userId)).filter((item) => item.workspaceId === workspaceId); const actions: Array<{ action: EmmyActionMetadata; createdAt: unknown; sequence: number }> = []; let sequence = 0;
    for (const conversation of conversations) for (const item of await this.repository.listMessages(conversation.id)) { sequence += 1; if (item.role === "assistant" && item.action) actions.push({ action: item.action, createdAt: item.createdAt, sequence }); }
    const candidates = actions.filter((item) => (!explicitId || item.action.actionId === explicitId) && (!scope || item.action.actionType.startsWith(scope)));
    candidates.sort((left, right) => { const a = typeof left.createdAt === "string" ? Date.parse(left.createdAt) : Number.NaN; const b = typeof right.createdAt === "string" ? Date.parse(right.createdAt) : Number.NaN; return Number.isFinite(a) && Number.isFinite(b) && a !== b ? a - b : left.sequence - right.sequence; });
    return candidates.at(-1)?.action;
  }
  async create(auth: AuthContext, body: unknown) {
    const input = body as { workspaceId?: unknown }; if (!input || Object.keys(input).some((key) => key !== "workspaceId") || (input.workspaceId !== undefined && input.workspaceId !== null && typeof input.workspaceId !== "string")) throw new ApiError(400, "INVALID_CONVERSATION", "A valid workspace context is required.");
    const workspaceId = typeof input.workspaceId === "string" ? input.workspaceId : null; if (workspaceId) await this.workspaces.requirePermission(auth, workspaceId, "emmy:use");
    return this.repository.create(auth.user.userId, workspaceId);
  }
  async list(auth: AuthContext) {
    const items = await this.repository.list(auth.user.userId); const visible: EmmyConversation[] = [];
    for (const item of items) { if (!item.workspaceId) visible.push(item); else { try { await this.workspaces.requirePermission(auth, item.workspaceId, "emmy:use"); visible.push(item); } catch { /* revoked workspaces stay hidden */ } } }
    return { items: visible };
  }
  async listWorkspace(auth: AuthContext, workspaceId: string) { await this.workspaces.requirePermission(auth, workspaceId, "emmy:use"); const items = await this.repository.list(auth.user.userId); return { items: items.filter((item) => item.workspaceId === workspaceId) }; }
  async listGeneral(auth: AuthContext) { const items = await this.repository.list(auth.user.userId); return { items: items.filter((item) => item.workspaceId === null) }; }
  async messages(auth: AuthContext, id: string) { await this.own(auth, id); return { items: await this.repository.listMessages(id) }; }
  async send(auth: AuthContext, id: string, body: unknown, requestId?: string) {
    const conversation = await this.own(auth, id); const prior = await this.repository.listMessages(id); const parsed = parseEmmyInput({ ...(body as object), history: boundedHistory(prior) });
    await this.repository.appendMessage(id, { role: "user", content: parsed.message });
    if (conversation.title === "New conversation") await this.repository.updateTitle(id, titleFrom(parsed.message));
    const rememberedAction = conversation.workspaceId && isOperationalFollowUp(parsed.message) ? await this.latestOperationalAction(auth, conversation.workspaceId, parsed.message) : undefined;
    const result = rememberedAction ? { reply: operationalReply(rememberedAction), action: rememberedAction, finalStatus: "completed" as const } : conversation.workspaceId ? await this.privateEmmy.send(auth, conversation.workspaceId, parsed, requestId) : await this.generalEmmy.send(parsed, requestId);
    const citations = "citations" in result ? result.citations as BusinessOsCitation[] | undefined : undefined;
    const action = "action" in result ? result.action as EmmyActionMetadata | undefined : undefined;
    const reply = truthfulActionReply(result.reply, action); const message = { role: "assistant" as const, content: reply, generationStatus: "completed" as const, ...(citations?.length ? { citations } : {}), ...(action ? { action } : {}) }; const assistantMessage = action ? await this.repository.upsertActionMessage(id, action.actionId, message) : await this.repository.appendMessage(id, message); if (conversation.workspaceId) { await this.notifyTerminalAction(auth, conversation.workspaceId, action); await this.recordOperation(auth, conversation.workspaceId, requestId, action); }
    return { ...result, reply, assistantMessage };
  }
  async sendStream(auth: AuthContext, id: string, body: unknown, requestId: string, signal: AbortSignal, onDelta: (delta: string) => void | Promise<void>, onActionState: (action: EmmyActionMetadata, assistantMessage: EmmyConversationMessage) => void | Promise<void> = () => undefined) {
    const conversation = await this.own(auth, id); if (!conversation.workspaceId) throw new ApiError(400, "PRIVATE_WORKSPACE_REQUIRED", "Streaming requires a private workspace conversation.");
    const prior = await this.repository.listMessages(id); const parsed = parseEmmyInput({ ...(body as object), history: boundedHistory(prior) });
    await this.repository.appendMessage(id, { role: "user", content: parsed.message }); if (conversation.title === "New conversation") await this.repository.updateTitle(id, titleFrom(parsed.message));
    let partial = "";
    try {
      const rememberedAction = isOperationalFollowUp(parsed.message) ? await this.latestOperationalAction(auth, conversation.workspaceId, parsed.message) : undefined;
      const result = rememberedAction ? { reply: operationalReply(rememberedAction), action: rememberedAction, finalStatus: "completed" as const } : await this.privateEmmy.send(auth, conversation.workspaceId, parsed, requestId, { signal, onReplyDelta: async (delta) => { partial += delta; await onDelta(delta); }, onActionState: async (action) => { const progressMessage = await this.repository.upsertActionMessage(id, action.actionId, { role: "assistant", content: actionProgressReply(action), generationStatus: "processing", action }); await this.recordOperation(auth, conversation.workspaceId!, requestId, action); await onActionState(action, progressMessage); } });
      const citations = "citations" in result ? result.citations as BusinessOsCitation[] | undefined : undefined;
      const action = "action" in result ? result.action as EmmyActionMetadata | undefined : undefined;
      const reply = truthfulActionReply(result.reply, action); const message = { role: "assistant" as const, content: reply, generationStatus: "completed" as const, ...(citations?.length ? { citations } : {}), ...(action ? { action } : {}) }; const assistantMessage = action ? await this.repository.upsertActionMessage(id, action.actionId, message) : await this.repository.appendMessage(id, message); await this.notifyTerminalAction(auth, conversation.workspaceId, action); await this.recordOperation(auth, conversation.workspaceId, requestId, action);
      return { ...result, reply, assistantMessage };
    } catch (caught) {
      if (partial) await this.repository.appendMessage(id, { role: "assistant", content: partial, generationStatus: "interrupted" });
      throw caught;
    }
  }
  async delete(auth: AuthContext, id: string) { await this.own(auth, id); await this.repository.delete(id); return { deleted: true as const, conversationId: id }; }
}
