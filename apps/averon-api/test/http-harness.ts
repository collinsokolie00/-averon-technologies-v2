import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable, Writable } from "node:stream";
import type { DecodedIdToken } from "firebase-admin/auth";
import { createRequestHandler, type AppConfig } from "../src/app.ts";
import type { TokenVerifier } from "../src/services/auth/authentication.ts";
import type { BusinessRepository } from "../src/domains/business/business.repository.ts";
import type { PaymentRepository } from "../src/domains/payments/payment.repository.ts";
import { PaymentService } from "../src/domains/payments/payment.service.ts";
import type { PaymentProvider } from "../src/providers/payments/stripe/stripe.adapter.ts";
import { EmmyService } from "../src/ai/emmy/emmy.service.ts";
import { InMemoryRateLimitStore, InMemoryRateLimiter, RateLimiter } from "../src/ai/emmy/rate-limiter.ts";
import type { AiProvider } from "../src/ai/providers/ai-provider.ts";
import type { CapabilityRegistry } from "../src/runtime/capabilities.ts";
import { WorkspaceAuthorizationService } from "../src/domains/workspaces/workspace.service.ts";
import type { WorkspaceRepository } from "../src/domains/workspaces/workspace.types.ts";
import type { BlogDraft, Business, EmmyConversation, EmmyConversationMessage, PageContent, PageContentField, PageMetadata, PageMetadataId, StaticPageId, Workspace, WorkspaceMembership } from "@averon/shared-types";
import { ApiError } from "../src/errors/api-error.ts";
import type { BusinessDecision, BusinessOs, BusinessOsSection } from "@averon/shared-types";
import type { BusinessOsRepository } from "../src/domains/business-os/business-os.types.ts";
import { BusinessOsService } from "../src/domains/business-os/business-os.service.ts";
import { PrivateEmmyService } from "../src/ai/emmy/private-emmy.ts";
import { AiDiagnosticsStore } from "../src/ai/diagnostics/diagnostics.store.ts";
import type { ProjectRepository } from "../src/domains/projects/project.repository.ts";
import type { ProjectEmailSender } from "../src/domains/projects/project.email.ts";
import { ProjectService } from "../src/domains/projects/project.service.ts";
import type { ConversationRepository } from "../src/domains/emmy-conversations/conversation.types.ts";
import { ConversationService } from "../src/domains/emmy-conversations/conversation.service.ts";
import type { BlogDraftCreatePayload, BlogDraftRepository, BlogDraftUpdatePatch } from "../src/domains/blog-drafts/blog-draft.types.ts";
import { ActionDiagnosticsStore, BlogDraftActionService } from "../src/domains/blog-drafts/blog-draft.actions.ts";
import type { PageMetadataRepository } from "../src/domains/page-metadata/page-metadata.types.ts";
import { PageMetadataService } from "../src/domains/page-metadata/page-metadata.service.ts";
import { SeoMetadataActionService } from "../src/domains/page-metadata/page-metadata.actions.ts";
import type { PageContentRepository } from "../src/domains/page-content/page-content.types.ts";
import { PageContentService } from "../src/domains/page-content/page-content.service.ts";
import { PageContentActionService } from "../src/domains/page-content/page-content.actions.ts";
import { FrontendSourceActionService } from "../src/domains/frontend-source/frontend-source.actions.ts";
import { BackendSourceActionService } from "../src/domains/backend-source/backend-source.actions.ts";
import type { WorkspaceTaskRepository } from "../src/domains/workspace-tasks/workspace-task.types.ts";
import { WorkspaceTaskService } from "../src/domains/workspace-tasks/workspace-task.service.ts";
import { MemoryWorkspaceTaskRepository } from "../src/domains/workspace-tasks/workspace-task.repository.ts";
import type { WorkspaceAutomationRepository } from "../src/domains/workspace-automations/workspace-automation.types.ts";
import { WorkspaceAutomationService } from "../src/domains/workspace-automations/workspace-automation.service.ts";
import { MemoryWorkspaceAutomationRepository } from "../src/domains/workspace-automations/workspace-automation.repository.ts";
import type { GuardianRepository } from "../src/domains/guardian/guardian.repository.ts";
import { GuardianService, RegisteredWebsiteHttpInspector, initialGuardianWebsites } from "../src/domains/guardian/guardian.service.ts";

export const readyCapabilities: CapabilityRegistry = {
  firebase: { state: "enabled", code: "CONFIGURED" }, firestore: { state: "enabled", code: "CLIENT_AVAILABLE" },
  payments: { state: "enabled", code: "CONFIGURED" }, emmy: { state: "enabled", code: "CONFIGURED" },
};

export class MemoryWorkspaceRepository implements WorkspaceRepository {
  businesses = new Map<string, Business>(); workspaces = new Map<string, Workspace>(); memberships = new Map<string, WorkspaceMembership>();
  constructor(input: { businesses?: Business[]; workspaces?: Workspace[]; memberships?: WorkspaceMembership[] } = {}) { for (const item of input.businesses ?? []) this.businesses.set(item.id, item); for (const item of input.workspaces ?? []) this.workspaces.set(item.id, item); for (const item of input.memberships ?? []) this.memberships.set(item.id, item); }
  private item(membership: WorkspaceMembership) { const workspace = this.workspaces.get(membership.workspaceId); const business = workspace && this.businesses.get(workspace.businessId); return workspace && business ? { membership, workspace, business } : null; }
  async listForUser(userId: string) { return [...this.memberships.values()].filter((m) => m.userId === userId && m.status === "active").map((m) => this.item(m)).filter((item): item is NonNullable<typeof item> => Boolean(item && item.workspace.status === "active" && item.business.status === "active")); }
  async resolve(userId: string, workspaceId: string) { return (await this.listForUser(userId)).find((item) => item.workspace.id === workspaceId) ?? null; }
  async listMembers(workspaceId: string) { return [...this.memberships.values()].filter((item) => item.workspaceId === workspaceId); }
  async addMember(input: { userId: string; workspaceId: string; role: "owner" | "admin" | "member" | "viewer" }) { const workspace = this.workspaces.get(input.workspaceId); if (!workspace) throw new ApiError(404, "WORKSPACE_NOT_FOUND", "The workspace was not found."); const id = `${input.workspaceId}__${input.userId}`; if (this.memberships.has(id)) throw new ApiError(409, "MEMBERSHIP_EXISTS", "The workspace membership already exists."); const item: WorkspaceMembership = { id, ...input, businessId: workspace.businessId, status: "active" }; this.memberships.set(id, item); return item; }
  async updateMember(input: { membershipId: string; role?: "owner" | "admin" | "member" | "viewer"; status?: "active" | "disabled" }) { const item = this.memberships.get(input.membershipId)!; const updated = { ...item, ...(input.role ? { role: input.role } : {}), ...(input.status ? { status: input.status } : {}) }; this.memberships.set(input.membershipId, updated); return updated; }
  async bootstrapOwner() { return 0; }
}

export class MemoryBusinessOsRepository implements BusinessOsRepository {
  roots = new Map<string, BusinessOs>(); sections = new Map<string, BusinessOsSection>(); decisions = new Map<string, BusinessDecision>(); audits: string[] = []; historyItems: import("@averon/shared-types").BusinessOsHistoryItem[] = [];
  async get(workspaceId: string) { return this.roots.get(workspaceId) ?? null; }
  async initialize(workspaceId: string, businessId: string) { const current = this.roots.get(workspaceId); if (current) return { item: current, created: false }; const item: BusinessOs = { workspaceId, businessId, status: "active", schemaVersion: 1 }; this.roots.set(workspaceId, item); return { item, created: true }; }
  async listSections(workspaceId: string, types?: BusinessOsSection["type"][], limit = 25) { return [...this.sections.values()].filter((item) => item.workspaceId === workspaceId && (!types?.length || types.includes(item.type))).sort((a, b) => a.type.localeCompare(b.type)).slice(0, limit); }
  async getSection(workspaceId: string, sectionId: string) { const item = this.sections.get(`${workspaceId}/${sectionId}`); return item ?? null; }
  async createSection(input: Omit<BusinessOsSection, "version"> & { actorId: string }) { const key = `${input.workspaceId}/${input.id}`; if (this.sections.has(key)) throw new ApiError(409, "BUSINESS_OS_SECTION_EXISTS", "exists"); const { actorId, ...rest } = input; const item = { ...rest, version: 1, updatedBy: actorId }; this.sections.set(key, item); this.audits.push("BUSINESS_OS_SECTION_CREATED"); this.historyItems.push({ id: `history-${this.historyItems.length + 1}`, workspaceId: input.workspaceId, eventType: "BUSINESS_OS_SECTION_CREATED", targetType: "section", targetId: input.id, version: 1, actorId }); return item; }
  async updateSection(workspaceId: string, sectionId: string, patch: Partial<BusinessOsSection>, actorId: string) { const key = `${workspaceId}/${sectionId}`; const current = this.sections.get(key); if (!current) throw new ApiError(404, "BUSINESS_OS_SECTION_NOT_FOUND", "missing"); const item = { ...current, ...patch, version: current.version + 1, updatedBy: actorId }; this.sections.set(key, item); this.audits.push("BUSINESS_OS_SECTION_UPDATED"); this.historyItems.push({ id: `history-${this.historyItems.length + 1}`, workspaceId, eventType: "BUSINESS_OS_SECTION_UPDATED", targetType: "section", targetId: sectionId, version: item.version, actorId }); return item; }
  async listDecisions(workspaceId: string) { return [...this.decisions.values()].filter((item) => item.workspaceId === workspaceId); }
  async createDecision(input: Omit<BusinessDecision, "version" | "createdBy" | "updatedBy"> & { actorId: string }) { const { actorId, ...rest } = input; const item = { ...rest, version: 1, createdBy: actorId, updatedBy: actorId }; this.decisions.set(`${input.workspaceId}/${input.id}`, item); this.audits.push("BUSINESS_DECISION_CREATED"); this.historyItems.push({ id: `history-${this.historyItems.length + 1}`, workspaceId: input.workspaceId, eventType: "BUSINESS_DECISION_CREATED", targetType: "decision", targetId: input.id, version: 1, actorId }); return item; }
  async updateDecision(workspaceId: string, decisionId: string, patch: Partial<BusinessDecision>, actorId: string) { const key = `${workspaceId}/${decisionId}`; const current = this.decisions.get(key); if (!current) throw new ApiError(404, "BUSINESS_DECISION_NOT_FOUND", "missing"); const item = { ...current, ...patch, version: current.version + 1, updatedBy: actorId }; this.decisions.set(key, item); this.audits.push("BUSINESS_DECISION_UPDATED"); this.historyItems.push({ id: `history-${this.historyItems.length + 1}`, workspaceId, eventType: "BUSINESS_DECISION_UPDATED", targetType: "decision", targetId: decisionId, version: item.version, actorId }); return item; }
  async listHistory(workspaceId: string, limit = 50) { return this.historyItems.filter((item) => item.workspaceId === workspaceId).slice(-limit).reverse(); }
}

export class MemoryConversationRepository implements ConversationRepository {
  conversations = new Map<string, EmmyConversation>(); messages = new Map<string, EmmyConversationMessage[]>(); next = 1;
  async create(userId: string, workspaceId: string | null) { const item: EmmyConversation = { id: `conversation-${this.next++}`, userId, workspaceId, title: "New conversation", status: "active" }; this.conversations.set(item.id, item); return item; }
  async list(userId: string) { return [...this.conversations.values()].filter((item) => item.userId === userId); }
  async get(id: string) { return this.conversations.get(id) ?? null; }
  async updateTitle(id: string, title: string) { this.conversations.set(id, { ...this.conversations.get(id)!, title }); }
  async listMessages(id: string) { return this.messages.get(id) ?? []; }
  async appendMessage(id: string, message: Omit<EmmyConversationMessage, "id" | "conversationId">) { const item = { id: `message-${this.next++}`, conversationId: id, ...message }; this.messages.set(id, [...(this.messages.get(id) ?? []), item]); return item; }
  async upsertActionMessage(id: string, actionId: string, message: Omit<EmmyConversationMessage, "id" | "conversationId">) { const items = this.messages.get(id) ?? []; const existing = items.find((item) => item.action?.actionId === actionId); const item = { id: existing?.id ?? `message-${this.next++}`, conversationId: id, ...message }; this.messages.set(id, [...items.filter((candidate) => candidate.id !== existing?.id), item]); return item; }
  async delete(id: string) { this.conversations.delete(id); this.messages.delete(id); }
}

export class MemoryBlogDraftRepository implements BlogDraftRepository {
  drafts = new Map<string, BlogDraft>(); actions = new Map<string, { type: string; workspaceId: string; draftId: string }>(); writes = 0; next = 1; corruptReadBack = false;
  async get(workspaceId: string, draftId: string) { const item = this.drafts.get(draftId); if (!item || item.workspaceId !== workspaceId) return null; return this.corruptReadBack ? { ...item, title: `${item.title} (mismatch)` } : structuredClone(item); }
  async create(actionId: string, input: BlogDraftCreatePayload & { workspaceId: string; businessId: string; actorId: string }) { const prior = this.actions.get(actionId); if (prior) { if (prior.type !== "blog.draft.create" || prior.workspaceId !== input.workspaceId) throw new ApiError(409, "ACTION_IDEMPOTENCY_CONFLICT", "conflict"); return { draft: structuredClone(this.drafts.get(prior.draftId)!), duplicate: true }; } const now = new Date().toISOString(); const draft: BlogDraft = { id: `draft-${this.next++}`, workspaceId: input.workspaceId, businessId: input.businessId, title: input.title, slug: input.slug, excerpt: input.excerpt, body: input.body, ...(input.seoTitle ? { seoTitle: input.seoTitle } : {}), ...(input.metaDescription ? { metaDescription: input.metaDescription } : {}), ...(input.tags ? { tags: input.tags } : {}), status: "draft", published: false, createdBy: input.actorId, updatedBy: input.actorId, createdAt: now, updatedAt: now }; this.drafts.set(draft.id, draft); this.actions.set(actionId, { type: "blog.draft.create", workspaceId: input.workspaceId, draftId: draft.id }); this.writes += 1; return { draft: structuredClone(draft), duplicate: false }; }
  async update(actionId: string, workspaceId: string, draftId: string, patch: BlogDraftUpdatePatch, actorId: string) { const prior = this.actions.get(actionId); if (prior) { if (prior.type !== "blog.draft.update" || prior.workspaceId !== workspaceId || prior.draftId !== draftId) throw new ApiError(409, "ACTION_IDEMPOTENCY_CONFLICT", "conflict"); return { draft: structuredClone(this.drafts.get(draftId)!), duplicate: true }; } const current = this.drafts.get(draftId); if (!current) throw new ApiError(404, "BLOG_DRAFT_NOT_FOUND", "missing"); if (current.workspaceId !== workspaceId) throw new ApiError(403, "ACTION_FORBIDDEN", "wrong workspace"); if (current.published || current.status !== "draft") throw new ApiError(400, "ACTION_UNSUPPORTED", "Only unpublished drafts may be updated."); const draft = { ...current, ...patch, status: "draft" as const, published: false as const, updatedBy: actorId, updatedAt: new Date().toISOString() }; this.drafts.set(draftId, draft); this.actions.set(actionId, { type: "blog.draft.update", workspaceId, draftId }); this.writes += 1; return { draft: structuredClone(draft), duplicate: false }; }
}

export class MemoryPageMetadataRepository implements PageMetadataRepository {
  records = new Map<string, PageMetadata>(); writes = 0; actions = new Map<string, { workspaceId: string; pageId: PageMetadataId }>(); corruptReadBack = false;
  constructor(records: readonly PageMetadata[] = []) { for (const item of records) this.records.set(`${item.workspaceId}/${item.pageId}`, structuredClone(item)); }
  async get(workspaceId: string, pageId: PageMetadataId) { const item = structuredClone(this.records.get(`${workspaceId}/${pageId}`) ?? null); return item && this.corruptReadBack ? { ...item, title: `${item.title} mismatch` } : item; }
  async getByRoute(workspaceId: string, route: string) { return structuredClone([...this.records.values()].find((item) => item.workspaceId === workspaceId && item.route === route) ?? null); }
  async seed(records: readonly PageMetadata[]) { let created = 0; for (const item of records) { const key = `${item.workspaceId}/${item.pageId}`; if (!this.records.has(key)) { this.records.set(key, structuredClone(item)); created += 1; } } return created; }
  async update(actionId: string, workspaceId: string, pageId: PageMetadataId, patch: import("@averon/shared-types").SeoMetadataPatch) { if (this.actions.has(actionId)) return { metadata: structuredClone(this.records.get(`${workspaceId}/${pageId}`)!), duplicate: true }; const key = `${workspaceId}/${pageId}`; const current = this.records.get(key); if (!current) throw new ApiError(404, "PAGE_METADATA_NOT_FOUND", "missing"); const metadata = { ...current, ...patch, version: current.version + 1 }; this.records.set(key, metadata); this.actions.set(actionId, { workspaceId, pageId }); this.writes += 1; return { metadata: structuredClone(metadata), duplicate: false }; }
}
export class MemoryPageContentRepository implements PageContentRepository {
  records = new Map<string, PageContent>(); actions = new Set<string>(); writes = 0; corruptReadBack = false;
  constructor(records: readonly PageContent[] = []) { for (const item of records) this.records.set(`${item.workspaceId}/${item.pageId}`, structuredClone(item)); }
  async get(workspaceId: string, pageId: StaticPageId) { const item = structuredClone(this.records.get(`${workspaceId}/${pageId}`) ?? null); if (item && this.corruptReadBack) item.sections[0].fields.heading = "mismatch"; return item; }
  async seed(records: readonly PageContent[]) { let count = 0; for (const item of records) { const key = `${item.workspaceId}/${item.pageId}`; if (!this.records.has(key)) { this.records.set(key, structuredClone(item)); count += 1; } } return count; }
  async update(actionId: string, workspaceId: string, pageId: StaticPageId, sectionId: string, patch: Partial<Record<PageContentField, string>>) { const key = `${workspaceId}/${pageId}`; const current = this.records.get(key); if (!current) throw new ApiError(404, "PAGE_CONTENT_NOT_FOUND", "missing"); if (this.actions.has(actionId)) return { content: structuredClone(current), duplicate: true }; const content = { ...current, version: current.version + 1, sections: current.sections.map((item) => item.sectionId === sectionId ? { ...item, fields: { ...item.fields, ...patch } } : item) }; this.records.set(key, content); this.actions.add(actionId); this.writes += 1; return { content: structuredClone(content), duplicate: false }; }
}

export const userToken: DecodedIdToken = {
  aud: "test", auth_time: 1, exp: 9_999_999_999, firebase: { identities: {}, sign_in_provider: "password" },
  iat: 1, iss: "test", sub: "user-1", uid: "user-1", email: "user@example.com", name: "Test User",
};

export class StubVerifier implements TokenVerifier {
  private readonly result: DecodedIdToken | Error;
  constructor(result: DecodedIdToken | Error = userToken) { this.result = result; }
  async verifyIdToken(_token: string): Promise<DecodedIdToken> {
    void _token;
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

export const emptyBusinessRepository: BusinessRepository = {
  async list() { return []; }, async get() { return null; }, async createQuote() { return "quote-1"; },
  async replyToQuote() {}, async assignContract() { return { contractId: "contract-1", invoiceId: "invoice-1", projectReference: "AVR-TEST" }; },
  async markMessageRead() {}, async markNotificationRead() { return false; }, async listNotifications() { return []; },
  async signContract() { return false; },
  async upsertCustomerProfile(auth) { return { id: auth.userId, uid: auth.userId, email: auth.email ?? "", name: auth.displayName ?? "Test User", company: "Averon Customer", emailVerified: auth.emailVerified, portalStatus: "pending" }; },
  async customerPortal() { return { profile: null, quotes: [], contracts: [], invoices: [], messages: [], notifications: [] }; },
  async createCustomerMessage() { return "message-1"; }, async markCustomerMessageRead() { return false; },
};
export const emptyPaymentRepository: PaymentRepository = { async getInvoice() { return null; }, async recordCheckout() {}, async getPaymentStatus() { return null; }, async reconcile(event) { return event.type === "unknown" ? "ignored" : "processed"; } };
export const emptyPaymentProvider: PaymentProvider = { async createCheckout() { return { id: "cs_test", url: "https://checkout.test/session" }; }, async getCheckout() { return null; }, verifyWebhook() { return { eventId: "evt_test", type: "unknown" }; } };
export const emptyAiProvider: AiProvider = { async generate() { return { text: "Test Emmy response" }; } };
export const emptyProjectRepository: ProjectRepository = {
  async findByContract() { return null; }, async getOwned() { return null; }, async listOwned() { return []; }, async createFromPaidContract() { return null; }, async markEmail() {}, async unlock() {}, async workspace() { return null; }, async addMessage() { return "message-1"; }, async addChangeRequest() { return "change-1"; }, async submitSatisfaction() {}, async regenerate() { return null; }, async updateAdmin() {}, async addMilestone() { return "milestone-1"; },
};
export const emptyProjectEmail: ProjectEmailSender = { async sendAccess() {} };

export async function request(
  path: string,
  options: { method?: string; authorization?: string; requestId?: string; verifier?: TokenVerifier; repository?: BusinessRepository; body?: unknown; rawBody?: string | Buffer; paymentRepository?: PaymentRepository; paymentProvider?: PaymentProvider; headers?: Record<string, string>; aiProvider?: AiProvider; emmyRateLimiter?: RateLimiter; privateEmmyRateLimiter?: RateLimiter; capabilities?: CapabilityRegistry; allowedOrigins?: string[]; workspaceRepository?: WorkspaceRepository; businessOsRepository?: BusinessOsRepository; conversationRepository?: ConversationRepository; blogDraftRepository?: BlogDraftRepository; pageMetadataRepository?: PageMetadataRepository; pageContentRepository?: PageContentRepository; frontendSourceActions?: FrontendSourceActionService; backendSourceActions?: BackendSourceActionService; guardianRepository?: GuardianRepository; guardianInspector?: import("../src/domains/guardian/guardian.service.ts").GuardianInspector; actionDiagnostics?: ActionDiagnosticsStore; aiDiagnostics?: AiDiagnosticsStore; projectRepository?: ProjectRepository; projectEmail?: ProjectEmailSender; projectAccessRateLimiter?: RateLimiter; workspaceTaskRepository?: WorkspaceTaskRepository; workspaceAutomationRepository?: WorkspaceAutomationRepository; automationNow?: () => Date } = {},
) {
  const sourceBody = options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
  const req = Readable.from(sourceBody === undefined ? [] : [sourceBody]) as IncomingMessage;
  Object.assign(req, { method: options.method ?? "GET", url: path, headers: {
    ...(options.authorization ? { authorization: options.authorization } : {}),
    ...(options.requestId ? { "x-request-id": options.requestId } : {}),
    ...options.headers,
  } });
  let body = "";
  const res = new Writable({ write(chunk, _encoding, callback) { body += chunk.toString(); callback(); } }) as ServerResponse;
  const headers = new Map<string, string>();
  Object.assign(res, {
    statusCode: 0,
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value); return res; },
    flushHeaders() {},
    end(chunk?: string) { if (chunk) body += chunk; return res; },
  });
  const config: AppConfig = { allowedOrigins: options.allowedOrigins ?? [], version: "test", environment: "test", build: "test-build" };
  const paymentProvider = options.paymentProvider ?? emptyPaymentProvider; const paymentRepository = options.paymentRepository ?? emptyPaymentRepository;
  const workspaceService = new WorkspaceAuthorizationService(options.workspaceRepository ?? new MemoryWorkspaceRepository());
  const aiProvider = options.aiProvider ?? emptyAiProvider; const businessOsService = new BusinessOsService(options.businessOsRepository ?? new MemoryBusinessOsRepository(), workspaceService);
  const aiDiagnostics = options.aiDiagnostics ?? new AiDiagnosticsStore();
  const projectRepository = options.projectRepository ?? emptyProjectRepository; const projectService = new ProjectService(projectRepository, options.projectEmail ?? emptyProjectEmail, "http://localhost:5173/client-portal");
  const blogDraftActions = new BlogDraftActionService(options.blogDraftRepository ?? new MemoryBlogDraftRepository(), workspaceService, options.actionDiagnostics);
  const pageMetadataRepository = options.pageMetadataRepository ?? new MemoryPageMetadataRepository(); const pageMetadataService = new PageMetadataService(pageMetadataRepository); const seoMetadataActions = new SeoMetadataActionService(pageMetadataRepository, workspaceService);
  const pageContentRepository = options.pageContentRepository ?? new MemoryPageContentRepository(); const pageContentService = new PageContentService(pageContentRepository); const pageContentActions = new PageContentActionService(pageContentRepository, workspaceService);
  const frontendSourceActions = options.frontendSourceActions ?? new FrontendSourceActionService(workspaceService, { async run() { return []; } });
  const backendSourceActions = options.backendSourceActions ?? new BackendSourceActionService(workspaceService, { async run() { return []; } }, new URL("../../..", import.meta.url).pathname);
  const taskRepository = options.workspaceTaskRepository ?? new MemoryWorkspaceTaskRepository();
  const workspaceAutomationService = new WorkspaceAutomationService(options.workspaceAutomationRepository ?? new MemoryWorkspaceAutomationRepository(), workspaceService, options.automationNow);
  const guardianService = options.guardianRepository ? new GuardianService(options.guardianRepository, workspaceService, options.guardianInspector ?? new RegisteredWebsiteHttpInspector(), aiDiagnostics, initialGuardianWebsites({})) : undefined;
  const emmyService = new EmmyService(aiProvider); const privateEmmyService = new PrivateEmmyService(aiProvider, workspaceService, businessOsService, aiDiagnostics, undefined, options.blogDraftRepository ? blogDraftActions : undefined, options.pageMetadataRepository ? seoMetadataActions : undefined, options.pageContentRepository ? pageContentActions : undefined, options.frontendSourceActions ? frontendSourceActions : undefined, options.backendSourceActions ? backendSourceActions : undefined, guardianService);
  const workspaceTaskService = new WorkspaceTaskService(taskRepository, workspaceService, privateEmmyService, aiDiagnostics);
  guardianService?.setTaskService(workspaceTaskService);
  await createRequestHandler(config, { tokenVerifier: options.verifier ?? new StubVerifier(), businessRepository: options.repository ?? emptyBusinessRepository, paymentProvider, paymentService: new PaymentService(paymentRepository, paymentProvider, "http://localhost:5173", (event) => projectService.activateFromPayment(event)), emmyService, privateEmmyService, conversationService: new ConversationService(options.conversationRepository ?? new MemoryConversationRepository(), workspaceService, emmyService, privateEmmyService), blogDraftActions, pageMetadataService, seoMetadataActions, pageContentService, pageContentActions, frontendSourceActions, backendSourceActions, ...(guardianService ? { guardianService } : {}), aiDiagnostics, emmyRateLimiter: options.emmyRateLimiter ?? new InMemoryRateLimiter(), privateEmmyRateLimiter: options.privateEmmyRateLimiter ?? new RateLimiter(new InMemoryRateLimitStore(), 30, 60_000, "PRIVATE_EMMY_RATE_LIMITED"), checkoutRateLimiter: new RateLimiter(new InMemoryRateLimitStore(), 10, 60_000), projectAccessRateLimiter: options.projectAccessRateLimiter ?? new RateLimiter(new InMemoryRateLimitStore(), 5, 300_000, "PROJECT_ACCESS_RATE_LIMITED"), projectService, projectRepository, capabilities: options.capabilities ?? readyCapabilities, workspaceService, businessOsService, workspaceTaskService, workspaceAutomationService })(req, res);
  const payload = !body || headers.get("content-type")?.includes("application/x-ndjson") ? {} : JSON.parse(body);
  return { status: res.statusCode, headers, rawBody: body, payload: payload as {
    success: boolean;
    requestId: string;
    data: Record<string, unknown>;
    error: { code: string; message: string };
  } };
}
