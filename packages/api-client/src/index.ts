import type { AdminSession, AgentCatalogResponse, AiDiagnostic, AiOrchestrationStatus, ApiFailure, ApiResponse, ApiSuccess, BusinessDecision, BusinessOs, BusinessOsCitation, BusinessOsHistoryItem, BusinessOsSection, EmmyConversation, EmmyConversationMessage, EmmyStreamEvent, PageContent, PageMetadata, PageMetadataId, PaymentCheckoutRequest, PaymentCheckoutResponse, PaymentSummary, SafeSession, StaticPageId, WorkspaceAutomation, WorkspaceAutomationDetail, WorkspaceAutomationsResponse, WorkspaceListResponse, WorkspacePermissionProjection, WorkspaceRunDetail, WorkspaceRunsResponse, WorkspaceSummary, WorkspaceTask, WorkspaceTaskDetail, WorkspaceTaskExecutionResult, WorkspaceTaskPriority, WorkspaceTaskStatus, WorkspaceTasksResponse } from "@averon/shared-types";
import type { WorkspaceNotification, WorkspaceNotificationCategory, WorkspaceNotificationStatus } from "@averon/shared-types";

export class AveronApiError extends Error {
  readonly failure: ApiFailure;
  readonly status: number;

  constructor(failure: ApiFailure, status: number) {
    super(failure.error.message);
    this.name = "AveronApiError";
    this.failure = failure;
    this.status = status;
  }
}

export interface AveronApiClientOptions {
  baseUrl: string;
  getAuthToken?: (forceRefresh?: boolean) => Promise<string | null>;
  timeoutMs?: number;
}

export interface CustomerProjectSummary { id: string; projectReference: string; title: string; summary: string; status: string; progressPercent: number; accessEnabled: boolean; unlocked: boolean; completedAt?: string; maintenanceStartAt?: string; maintenanceEndAt?: string; satisfaction?: "satisfied" | "not_satisfied" }
export interface CustomerProjectFile { id:string; projectId:string; name:string; category:"deliverable"|"document"|"design"|"report"|"other"; mimeType:string; sizeBytes:number; description?:string; version:number; customerVisible:boolean; deliveryStatus:"working"|"deliverable"|"final"; uploadedAt?:unknown; firstDownloadedAt?:unknown; latestDownloadedAt?:unknown; downloadCount:number }
export interface CustomerProjectWorkspace { project: CustomerProjectSummary & { contractId: string; startDate?: string; targetDate?: string }; milestones: Array<{ id: string; title: string; description: string; status: string; order: number; targetDate?: string }>; messages: Array<{ id: string; body: string; senderRole: "customer" | "admin"; createdAt?: unknown }>; changeRequests: Array<{ id: string; title: string; description: string; status: string; priority: string }>; files: CustomerProjectFile[]; invoices: Array<{ id: string; status?: string; amountCents?: number; currency?: string }>; payments: Array<{ id: string; status?: string; amountCents?: number; currency?: string }>; contract: ({ id: string; status?: string; title?: string } & Record<string, unknown>) | null; maintenanceScope: { included: readonly string[]; excluded: readonly string[] } }
export interface CustomerPortalRecord { id: string; [key: string]: unknown }
export interface CustomerPortalData { profile: CustomerPortalRecord | null; quotes: CustomerPortalRecord[]; contracts: CustomerPortalRecord[]; invoices: CustomerPortalRecord[]; messages: CustomerPortalRecord[]; notifications: CustomerPortalRecord[] }

export class AveronApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly options: AveronApiClientOptions;

  constructor(options: AveronApiClientOptions) {
    this.options = options;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async request<T>(path: string, init: RequestInit = {}, hasRetried = false): Promise<ApiSuccess<T>> {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const token = await this.options.getAuthToken?.(hasRetried);
      const headers = new Headers(init.headers);
      headers.set("Accept", "application/json");
      if (init.body) headers.set("Content-Type", "application/json");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers, signal: controller.signal });
      const payload = await response.json() as ApiResponse<T>;
      if (response.status === 401 && token && !hasRetried && this.options.getAuthToken) {
        return this.request<T>(path, init, true);
      }
      if (!response.ok || !payload.success) throw new AveronApiError(payload as ApiFailure, response.status);
      return payload as ApiSuccess<T>;
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  health() {
    return this.request<{ status: "ok"; service: string }>("/health");
  }

  submitPublicQuote(input: { customerEmail: string; customerName: string; company: string; projectType: string; budget: string; message: string }) {
    return this.request<{ quoteId: string }>("/api/v1/public/quotes", { method: "POST", body: JSON.stringify(input) });
  }
  pageMetadata = {
    get: (workspaceId: string, pageId: PageMetadataId) => this.request<PageMetadata>(`/api/v1/public/workspaces/${encodeURIComponent(workspaceId)}/page-metadata/${encodeURIComponent(pageId)}`),
  };
  pageContent = {
    get: (workspaceId: string, pageId: StaticPageId) => this.request<PageContent>(`/api/v1/public/workspaces/${encodeURIComponent(workspaceId)}/page-content/${encodeURIComponent(pageId)}`),
  };

  session() { return this.request<SafeSession>("/api/v1/session"); }
  customer = {
    upsertProfile: (input: { name?: string; company?: string; authProvider?: "password" | "google" } = {}) => this.request<{ id: string; uid: string; name: string; email: string; company: string; emailVerified: boolean; portalStatus: "pending" | "active" }>("/api/v1/customer/profile", { method: "POST", body: JSON.stringify(input) }),
    portal: () => this.request<CustomerPortalData>("/api/v1/customer/portal"),
    updateProfile: (input: { name?: string; company?: string; phone?: string; notificationPreference?: "important" | "all" | "weekly"; communicationPreference?: "email" | "portal" }) => this.request<CustomerPortalRecord>("/api/v1/customer/profile", { method: "PATCH", body: JSON.stringify(input) }),
    sendMessage: (input: { subject: string; body: string }) => this.request<{ messageId: string }>("/api/v1/customer/messages", { method: "POST", body: JSON.stringify(input) }),
    markMessageRead: (id: string) => this.request<{ messageId: string; status: "read" }>(`/api/v1/customer/messages/${encodeURIComponent(id)}`, { method: "PATCH", body: "{}" }),
  };
  adminSession() { return this.request<AdminSession>("/api/v1/admin/session"); }
  workspaces = {
    list: () => this.request<WorkspaceListResponse>("/api/v1/workspaces"),
    get: (workspaceId: string) => this.request<WorkspaceSummary>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}`),
  };
  agents = { list: (workspaceId: string) => this.request<AgentCatalogResponse>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents`) };
  permissions = { get: (workspaceId: string) => this.request<WorkspacePermissionProjection>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/permissions`) };
  runs = { list: (workspaceId: string) => this.request<WorkspaceRunsResponse>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/runs`), get: (workspaceId: string, operationId: string) => this.request<WorkspaceRunDetail>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/runs/${encodeURIComponent(operationId)}`) };
  tasks = { list: (workspaceId: string, filters: { status?: WorkspaceTaskStatus; priority?: WorkspaceTaskPriority; assignedAgentId?: string } = {}) => { const query = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))); return this.request<WorkspaceTasksResponse>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/tasks${query.size ? `?${query}` : ""}`); }, get: (workspaceId: string, taskId: string) => this.request<WorkspaceTaskDetail>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}`), create: (workspaceId: string, input: Pick<WorkspaceTask, "title" | "description" | "priority" | "assignedAgentIds"> & Partial<Pick<WorkspaceTask, "dueAt">>) => this.request<WorkspaceTask>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/tasks`, { method: "POST", body: JSON.stringify(input) }), update: (workspaceId: string, taskId: string, input: { expectedVersion: number } & Partial<Pick<WorkspaceTask, "title" | "description" | "status" | "priority" | "assignedAgentIds" | "dueAt">>) => this.request<WorkspaceTask>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}`, { method: "PATCH", body: JSON.stringify(input) }), execute: (workspaceId: string, taskId: string, idempotencyKey: string) => this.request<WorkspaceTaskExecutionResult>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/tasks/${encodeURIComponent(taskId)}/execute`, { method: "POST", body: JSON.stringify({ idempotencyKey }) }) };
  automations = { list: (workspaceId: string) => this.request<WorkspaceAutomationsResponse>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/automations`), get: (workspaceId: string, automationId: string) => this.request<WorkspaceAutomationDetail>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/automations/${encodeURIComponent(automationId)}`), create: (workspaceId: string, input: Pick<WorkspaceAutomation, "title" | "description" | "enabled" | "trigger" | "operation">) => this.request<WorkspaceAutomation>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/automations`, { method: "POST", body: JSON.stringify(input) }), update: (workspaceId: string, automationId: string, input: { expectedVersion: number } & Partial<Pick<WorkspaceAutomation, "title" | "description" | "enabled" | "trigger" | "operation">>) => this.request<WorkspaceAutomation>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/automations/${encodeURIComponent(automationId)}`, { method: "PATCH", body: JSON.stringify(input) }) };
  businessOs = {
    get: (workspaceId: string) => this.request<{ businessOs: BusinessOs | null; workspace: WorkspaceSummary["workspace"]; business: WorkspaceSummary["business"]; access: { canManage: boolean } }>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/business-os`),
    initialize: (workspaceId: string) => this.request<{ item: BusinessOs; created: boolean }>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/business-os`, { method: "POST", body: "{}" }),
    listSections: (workspaceId: string) => this.request<{ items: BusinessOsSection[] }>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/business-os/sections`),
    getSection: (workspaceId: string, sectionId: string) => this.request<BusinessOsSection>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/business-os/sections/${encodeURIComponent(sectionId)}`),
    createSection: (workspaceId: string, input: Pick<BusinessOsSection, "id" | "type" | "title" | "content" | "visibility" | "status">) => this.request<BusinessOsSection>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/business-os/sections`, { method: "POST", body: JSON.stringify(input) }),
    updateSection: (workspaceId: string, sectionId: string, input: Partial<Pick<BusinessOsSection, "title" | "content" | "visibility" | "status">>) => this.request<BusinessOsSection>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/business-os/sections/${encodeURIComponent(sectionId)}`, { method: "PATCH", body: JSON.stringify(input) }),
    listDecisions: (workspaceId: string) => this.request<{ items: BusinessDecision[] }>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/business-os/decisions`),
    createDecision: (workspaceId: string, input: Pick<BusinessDecision, "id" | "title" | "summary" | "status"> & Partial<Pick<BusinessDecision, "rationale" | "effectiveDate" | "supersedes">>) => this.request<BusinessDecision>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/business-os/decisions`, { method: "POST", body: JSON.stringify(input) }),
    updateDecision: (workspaceId: string, decisionId: string, input: Partial<Pick<BusinessDecision, "title" | "summary" | "rationale" | "status" | "effectiveDate" | "supersedes" | "supersededBy">>) => this.request<BusinessDecision>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/business-os/decisions/${encodeURIComponent(decisionId)}`, { method: "PATCH", body: JSON.stringify(input) }),
    history: (workspaceId: string) => this.request<{ items: BusinessOsHistoryItem[] }>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/business-os/history`),
  };
  business = {
    decideQuote: (id: string, decision: "accepted" | "rejected", revision: number) => this.request<{quoteId:string;status:string}>(`/api/v1/quotes/${encodeURIComponent(id)}/decision`, {method:"PATCH",body:JSON.stringify({decision,revision})}),
    replyToMessage: (id: string, body: string) => this.request<{messageId:string}>(`/api/v1/messages/${encodeURIComponent(id)}/reply`, {method:"POST",body:JSON.stringify({body})}),
    issueQuote: (id: string, input: {adminReply:string;amountCents:number;currency:"eur"|"usd"}) => this.request<{quoteId:string}>(`/api/v1/quotes/${encodeURIComponent(id)}`, {method:"PATCH",body:JSON.stringify({...input,status:"approved"})}),
    list: (collection: "users" | "quotes" | "contracts" | "invoices" | "payments" | "messages" | "notifications" | "auditLogs") =>
      this.request<{ items: Array<{ id: string; [key: string]: unknown }> }>(`/api/v1/business/${collection}`),
    createQuote: (input: Record<string, unknown>) => this.request<{ quoteId: string }>("/api/v1/quotes", { method: "POST", body: JSON.stringify(input) }),
    replyToQuote: (id: string, input: { status: "approved" | "replied" | "cancelled"; adminReply: string }) => this.request<{ quoteId: string }>(`/api/v1/quotes/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
    assignContract: (input: Record<string, unknown>) => this.request<{ contractId: string; invoiceId: string; projectReference: string }>("/api/v1/contracts", { method: "POST", body: JSON.stringify(input) }),
    signContract: (id: string, typedSignature: string) => this.request<{ contractId: string; status: "signed" }>(`/api/v1/contracts/${encodeURIComponent(id)}/sign`, { method: "PATCH", body: JSON.stringify({ typedSignature }) }),
    markMessageRead: (id: string) => this.request<{ messageId: string; status: "read" }>(`/api/v1/messages/${encodeURIComponent(id)}/read`, { method: "PATCH", body: "{}" }),
    notifications: () => this.request<{ items: Array<{ id: string; [key: string]: unknown }> }>("/api/v1/notifications"),
    markNotificationRead: (id: string) => this.request<{ notificationId: string; status: "read" }>(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH", body: "{}" }),
    dashboard: () => this.request<Record<string, number>>("/api/v1/admin/dashboard"),
  };
  payments = {
    createCheckout: (input: PaymentCheckoutRequest) => this.request<PaymentCheckoutResponse>("/api/v1/payments/checkout", { method: "POST", body: JSON.stringify(input) }),
    status: (reference: string) => this.request<PaymentSummary>(`/api/v1/payments/status/${encodeURIComponent(reference)}`),
  };
  projects = {
    list: () => this.request<{ items: CustomerProjectSummary[] }>("/api/v1/projects"),
    verifyAccess: (projectId: string, accessPassword: string) => this.request<{ projectId: string; unlocked: true }>(`/api/v1/projects/${encodeURIComponent(projectId)}/access/verify`, { method: "POST", body: JSON.stringify({ accessPassword }) }),
    workspace: (projectId: string) => this.request<CustomerProjectWorkspace>(`/api/v1/projects/${encodeURIComponent(projectId)}/workspace`),
    sendMessage: (projectId: string, body: string) => this.request<{ messageId: string }>(`/api/v1/projects/${encodeURIComponent(projectId)}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
    submitChangeRequest: (projectId: string, input: { title: string; description: string; category: string; priority: "low" | "normal" | "high" }) => this.request<{ changeRequestId: string }>(`/api/v1/projects/${encodeURIComponent(projectId)}/change-requests`, { method: "POST", body: JSON.stringify(input) }),
    submitSatisfaction: (projectId: string, input: { satisfaction: "satisfied" | "not_satisfied"; comment?: string; category?: string; severity?: "low" | "normal" | "high"; desiredResolution?: string }) => this.request<{ recorded: true }>(`/api/v1/projects/${encodeURIComponent(projectId)}/satisfaction`, { method: "POST", body: JSON.stringify(input) }),
    downloadFile: (projectId:string,fileId:string)=>this.request<{url:string;expiresAt:string}>(`/api/v1/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}/download`,{method:"POST",body:"{}"}),
  };
  adminProjects = {
    lifecycle:(id:string)=>this.request<{milestones:CustomerProjectWorkspace["milestones"];changeRequests:CustomerProjectWorkspace["changeRequests"]}>(`/api/v1/admin/projects/${encodeURIComponent(id)}/lifecycle`),
    updateMilestone:(projectId:string,id:string,input:{status:"pending"|"in_progress"|"completed"|"blocked";progressPercent:number})=>this.request<{id:string;status:string}>(`/api/v1/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(input)}),
    decideChange:(projectId:string,id:string,status:"approved"|"declined"|"completed")=>this.request<{id:string;status:string}>(`/api/v1/projects/${encodeURIComponent(projectId)}/change-requests/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({status})}),
    list:()=>this.request<{items:Array<CustomerProjectSummary&{customerId:string;customerEmail:string}>}>("/api/v1/admin/projects"),
    uploadFile:(projectId:string,input:{name:string;description?:string;category:CustomerProjectFile["category"];deliveryStatus:CustomerProjectFile["deliveryStatus"];customerVisible:boolean;mimeType:string;contentBase64:string;idempotencyKey:string})=>this.request<{file:CustomerProjectFile;created:boolean}>(`/api/v1/admin/projects/${encodeURIComponent(projectId)}/files`,{method:"POST",body:JSON.stringify(input)}),
  };
  emmy = {
    sendMessage: (input: { message: string; history?: Array<{ role: "user" | "assistant"; content: string }> }) => this.request<{ reply: string }>("/api/v1/emmy/messages", { method: "POST", body: JSON.stringify(input) }),
    sendPrivateMessage: (workspaceId: string, input: { message: string; history?: Array<{ role: "user" | "assistant"; content: string }> }) => this.request<{ reply: string; workspace: { id: string; name: string }; businessOsStatus: "ready" | "empty" | "uninitialized"; finalStatus: AiOrchestrationStatus; citations?: BusinessOsCitation[] }>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/emmy/messages`, { method: "POST", body: JSON.stringify(input) }),
  };
  conversations = {
    list: () => this.request<{ items: EmmyConversation[] }>("/api/v1/emmy/conversations"),
    listWorkspace: (workspaceId: string) => this.request<{ items: EmmyConversation[] }>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/emmy/conversations`),
    listGeneral: () => this.request<{ items: EmmyConversation[] }>("/api/v1/emmy/conversations/general"),
    create: (workspaceId: string | null) => this.request<EmmyConversation>("/api/v1/emmy/conversations", { method: "POST", body: JSON.stringify({ workspaceId }) }),
    messages: (conversationId: string) => this.request<{ items: EmmyConversationMessage[] }>(`/api/v1/emmy/conversations/${encodeURIComponent(conversationId)}/messages`),
    send: (conversationId: string, message: string) => this.request<{ reply: string; assistantMessage: EmmyConversationMessage; workspace?: { id: string; name: string }; businessOsStatus?: "ready" | "empty" | "uninitialized"; finalStatus?: AiOrchestrationStatus; citations?: BusinessOsCitation[] }>(`/api/v1/emmy/conversations/${encodeURIComponent(conversationId)}/messages`, { method: "POST", body: JSON.stringify({ message }) }),
    stream: async (conversationId: string, message: string, options: { signal?: AbortSignal; onEvent: (event: EmmyStreamEvent) => void | Promise<void> }) => {
      const token = await this.options.getAuthToken?.(); const headers = new Headers({ Accept: "application/x-ndjson", "Content-Type": "application/json" }); if (token) headers.set("Authorization", `Bearer ${token}`);
      const response = await fetch(`${this.baseUrl}/api/v1/emmy/conversations/${encodeURIComponent(conversationId)}/messages/stream`, { method: "POST", headers, body: JSON.stringify({ message }), signal: options.signal });
      if (!response.ok || !response.body) { const payload = await response.json().catch(() => ({ success: false, error: { code: "STREAM_UNAVAILABLE", message: "Emmy streaming is unavailable." }, requestId: "unknown" })) as ApiFailure; throw new AveronApiError(payload, response.status); }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let completed: Extract<EmmyStreamEvent, { type: "completed" }> | undefined;
      const consume = async (line: string) => { if (!line.trim()) return; const event = JSON.parse(line) as EmmyStreamEvent; await options.onEvent(event); if (event.type === "completed") completed = event; if (event.type === "interrupted") throw new AveronApiError({ success: false, error: { code: event.code, message: event.message }, requestId: event.requestId }, 502); };
      while (true) { const chunk = await reader.read(); buffer += decoder.decode(chunk.value, { stream: !chunk.done }); const lines = buffer.split("\n"); buffer = lines.pop() ?? ""; for (const line of lines) await consume(line); if (chunk.done) break; }
      if (buffer.trim()) await consume(buffer); if (!completed) throw new Error("Emmy stream ended before completion."); return completed;
    },
    delete: (conversationId: string) => this.request<{ deleted: true; conversationId: string }>(`/api/v1/emmy/conversations/${encodeURIComponent(conversationId)}`, { method: "DELETE" }),
  };
  aiDiagnostics = { list: (limit = 25) => this.request<{ items: AiDiagnostic[] }>(`/api/v1/admin/ai/diagnostics?limit=${encodeURIComponent(String(limit))}`), get: (requestId: string) => this.request<AiDiagnostic>(`/api/v1/admin/ai/diagnostics/${encodeURIComponent(requestId)}`) };
  workspaceNotifications = {
    list: (filters: { workspaceId?: string; category?: WorkspaceNotificationCategory; status?: WorkspaceNotificationStatus } = {}) => { const query = new URLSearchParams(); if (filters.workspaceId) query.set("workspaceId", filters.workspaceId); if (filters.category) query.set("category", filters.category); if (filters.status) query.set("status", filters.status); return this.request<{ items: WorkspaceNotification[] }>(`/api/v1/workspace-notifications${query.size ? `?${query}` : ""}`); },
    setStatus: (id: string, status: WorkspaceNotificationStatus) => this.request<WorkspaceNotification>(`/api/v1/workspace-notifications/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  };
}
