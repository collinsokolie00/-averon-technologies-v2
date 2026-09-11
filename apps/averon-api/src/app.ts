import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ApiFailure, ApiSuccess } from "@averon/shared-types";
import { ApiError } from "./errors/api-error.ts";
import { FirebaseBusinessRepository } from "./domains/business/business.repository.ts";
import { handleBusinessRoute } from "./domains/business/business.routes.ts";
import { log } from "./logger.ts";
import { requireAuthentication } from "./middleware/authentication.ts";
import { adminSessionResponse, sessionResponse } from "./routes/session.ts";
import { FirebaseTokenVerifier } from "./services/auth/authentication.ts";
import type { AppDependencies, RequestContext } from "./types/http.ts";
import { FirebasePaymentRepository } from "./domains/payments/payment.repository.ts";
import { PaymentService } from "./domains/payments/payment.service.ts";
import { handlePaymentRoute, handleStripeWebhook } from "./domains/payments/payment.routes.ts";
import { StripePaymentProvider } from "./providers/payments/stripe/stripe.adapter.ts";
import { DeepSeekProvider } from "./ai/providers/deepseek/deepseek.provider.ts";
import { EmmyService } from "./ai/emmy/emmy.service.ts";
import { parseEmmyInput } from "./ai/emmy/emmy.schemas.ts";
import { InMemoryRateLimiter } from "./ai/emmy/rate-limiter.ts";
import { InMemoryRateLimitStore, RateLimiter } from "./ai/emmy/rate-limiter.ts";
import { buildCapabilityRegistry, readiness } from "./runtime/capabilities.ts";
import { logAiOperation } from "./observability/operations.ts";
import { FirebaseWorkspaceRepository } from "./domains/workspaces/workspace.repository.ts";
import { WorkspaceAuthorizationService } from "./domains/workspaces/workspace.service.ts";
import { FirebaseBusinessOsRepository } from "./domains/business-os/business-os.repository.ts";
import { BusinessOsService } from "./domains/business-os/business-os.service.ts";
import { handleBusinessOsRoute } from "./domains/business-os/business-os.routes.ts";
import { PrivateEmmyService } from "./ai/emmy/private-emmy.ts";
import { AiDiagnosticsStore, diagnosticsRetention, FirebaseDiagnosticsRepository } from "./ai/diagnostics/diagnostics.store.ts";
import { parseQuoteSubmission } from "./domains/business/business.schemas.ts";
import { FirebaseProjectRepository } from "./domains/projects/project.repository.ts";
import { ResendProjectEmailSender } from "./domains/projects/project.email.ts";
import { ProjectService } from "./domains/projects/project.service.ts";
import { handleProjectRoute } from "./domains/projects/project.routes.ts";
import { configuredProjectFileStorage } from "./domains/projects/project-file.storage.ts";
import { FirebaseConversationRepository } from "./domains/emmy-conversations/conversation.repository.ts";
import { ConversationService } from "./domains/emmy-conversations/conversation.service.ts";
import { handleConversationRoute } from "./domains/emmy-conversations/conversation.routes.ts";
import { FirebaseBlogDraftRepository } from "./domains/blog-drafts/blog-draft.repository.ts";
import { BlogDraftActionService } from "./domains/blog-drafts/blog-draft.actions.ts";
import { handleBlogDraftRoute } from "./domains/blog-drafts/blog-draft.routes.ts";
import { ACTION_DEPENDENCY_FINGERPRINT } from "./ai/actions/action-capabilities.ts";
import { BLOG_UPDATE_ADAPTER_FINGERPRINT } from "./domains/blog-drafts/blog-draft.payload-adapter.ts";
import { FirebasePageMetadataRepository } from "./domains/page-metadata/page-metadata.repository.ts";
import { PageMetadataService } from "./domains/page-metadata/page-metadata.service.ts";
import { handlePublicPageMetadataRoute } from "./domains/page-metadata/page-metadata.routes.ts";
import { SeoMetadataActionService } from "./domains/page-metadata/page-metadata.actions.ts";
import { FirebasePageContentRepository } from "./domains/page-content/page-content.repository.ts";
import { PageContentService } from "./domains/page-content/page-content.service.ts";
import { PageContentActionService } from "./domains/page-content/page-content.actions.ts";
import { handlePublicPageContentRoute } from "./domains/page-content/page-content.routes.ts";
import { FrontendSourceActionService } from "./domains/frontend-source/frontend-source.actions.ts";
import { FixedFrontendValidationRunner } from "./domains/frontend-source/frontend-source.validation.ts";
import { FirebaseFrontendSourceProposalRepository } from "./domains/frontend-source/frontend-source.repository.ts";
import { BackendSourceActionService } from "./domains/backend-source/backend-source.actions.ts";
import { FixedBackendValidationRunner } from "./domains/backend-source/backend-source.validation.ts";
import { FirebaseBackendSourceProposalRepository } from "./domains/backend-source/backend-source.repository.ts";
import { FirebaseWorkspaceNotificationRepository, MemoryWorkspaceNotificationRepository } from "./domains/workspace-notifications/workspace-notification.repository.ts";
import { WorkspaceNotificationService } from "./domains/workspace-notifications/workspace-notification.service.ts";
import { handleWorkspaceNotificationRoute } from "./domains/workspace-notifications/workspace-notification.routes.ts";
import { AnalyticsWorkspaceHealthAnalyzer, DiagnosticsWorkspaceHealthEvidenceCollector } from "./domains/workspace-notifications/analytics-health-review.ts";
import { AgentCatalogService } from "./ai/agents/catalog.ts";
import { handleAgentCatalogRoute } from "./ai/agents/catalog.routes.ts";
import { WorkspaceRunsService } from "./ai/runs/runs.service.ts";
import { handleWorkspaceRunsRoute } from "./ai/runs/runs.routes.ts";
import { WorkspacePermissionProjectionService } from "./ai/permissions/permissions.service.ts";
import { handleWorkspacePermissionsRoute } from "./ai/permissions/permissions.routes.ts";
import { WorkspaceTaskService } from "./domains/workspace-tasks/workspace-task.service.ts";
import { FirebaseWorkspaceTaskRepository, MemoryWorkspaceTaskRepository } from "./domains/workspace-tasks/workspace-task.repository.ts";
import { handleWorkspaceTaskRoute } from "./domains/workspace-tasks/workspace-task.routes.ts";
import { WorkspaceAutomationService } from "./domains/workspace-automations/workspace-automation.service.ts";
import { FirebaseWorkspaceAutomationRepository, MemoryWorkspaceAutomationRepository } from "./domains/workspace-automations/workspace-automation.repository.ts";
import { handleWorkspaceAutomationRoute } from "./domains/workspace-automations/workspace-automation.routes.ts";
import { WorkspaceAutomationRunner } from "./domains/workspace-automations/workspace-automation.runner.ts";
import { FirebaseGuardianRepository } from "./domains/guardian/guardian.repository.ts";
import { GuardianService, RegisteredWebsiteHttpInspector, initialGuardianWebsites } from "./domains/guardian/guardian.service.ts";
import { CompositeGuardianInspector, GuardianBrowserInspector } from "./domains/guardian/guardian.browser.ts";
import { handleGuardianRoute } from "./domains/guardian/guardian.routes.ts";
import { FirebaseGuardianRepairPlanRepository } from "./domains/guardian/guardian-repair.repository.ts";
import { GuardianRepairService } from "./domains/guardian/guardian-repair.service.ts";
import { CanonicalGuardianRepairSpecialistRunner } from "./domains/guardian/guardian-repair.specialists.ts";
import { ExistingSourceGuardianRepairExecutor } from "./domains/guardian/guardian-repair.executor.ts";

export interface AppConfig { allowedOrigins: string[]; version: string; environment?: string; build?: string }
export const ACTION_RUNTIME_FINGERPRINT = `blog-draft-actions-v1-fail-closed|${ACTION_DEPENDENCY_FINGERPRINT}|${BLOG_UPDATE_ADAPTER_FINGERPRINT}`;
export const API_RUNTIME_STARTED_AT = new Date().toISOString();

const JSON_BODY_LIMIT = 128 * 1024;
const EMMY_BODY_LIMIT = 32 * 1024;
const STRIPE_WEBHOOK_BODY_LIMIT = 1024 * 1024;

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function success<T>(data: T, requestId: string): ApiSuccess<T> { return { success: true, data, requestId }; }
function failure(code: string, message: string, requestId: string, details?: unknown): ApiFailure {
  return { success: false, error: { code, message, ...(details === undefined ? {} : { details }) }, requestId };
}

async function readJson(req: IncomingMessage, limit = JSON_BODY_LIMIT): Promise<unknown> {
  const buffer = await readBody(req, limit);
  try { return buffer.length ? JSON.parse(buffer.toString("utf8")) : {}; }
  catch { throw new ApiError(400, "INVALID_JSON", "The request body must be valid JSON."); }
}

async function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > limit) throw new ApiError(413, "REQUEST_TOO_LARGE", "The request body is too large.");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export function defaultDependencies(): AppDependencies {
  const provider = new StripePaymentProvider();
  const frontendOrigin = process.env.PAYMENT_FRONTEND_ORIGIN?.trim() || "http://localhost:5173";
  const parsedOrigin = new URL(frontendOrigin);
  if (parsedOrigin.origin !== frontendOrigin.replace(/\/$/, "") || !["http:", "https:"].includes(parsedOrigin.protocol)) throw new Error("PAYMENT_FRONTEND_ORIGIN must be an HTTP(S) origin without a path.");
  const workspaceService = new WorkspaceAuthorizationService(new FirebaseWorkspaceRepository());
  const businessOsService = new BusinessOsService(new FirebaseBusinessOsRepository(), workspaceService);
  const projectRepository = new FirebaseProjectRepository();
  const projectService = new ProjectService(projectRepository, new ResendProjectEmailSender(), `${parsedOrigin.origin}/client-portal`, configuredProjectFileStorage());
  const aiProvider = new DeepSeekProvider();
  const retention = diagnosticsRetention(process.env); const aiDiagnostics = new AiDiagnosticsStore(retention.maximum, retention.days, new FirebaseDiagnosticsRepository());
  const blogDraftActions = new BlogDraftActionService(new FirebaseBlogDraftRepository(), workspaceService);
  const pageMetadataRepository = new FirebasePageMetadataRepository(); const pageMetadataService = new PageMetadataService(pageMetadataRepository); const seoMetadataActions = new SeoMetadataActionService(pageMetadataRepository, workspaceService);
  const pageContentRepository = new FirebasePageContentRepository(); const pageContentService = new PageContentService(pageContentRepository); const pageContentActions = new PageContentActionService(pageContentRepository, workspaceService);
  const frontendSourceActions = new FrontendSourceActionService(workspaceService, new FixedFrontendValidationRunner(), undefined, new FirebaseFrontendSourceProposalRepository());
  const backendSourceActions = new BackendSourceActionService(workspaceService, new FixedBackendValidationRunner(), new URL("../../../", import.meta.url).pathname, new FirebaseBackendSourceProposalRepository());
  const guardianService = new GuardianService(new FirebaseGuardianRepository(), workspaceService, new CompositeGuardianInspector([new RegisteredWebsiteHttpInspector(), new GuardianBrowserInspector()]), aiDiagnostics, initialGuardianWebsites(process.env));
  const guardianRepairService = new GuardianRepairService(new FirebaseGuardianRepairPlanRepository(), new FirebaseGuardianRepository(), workspaceService, aiDiagnostics, new ExistingSourceGuardianRepairExecutor(frontendSourceActions, backendSourceActions), new CanonicalGuardianRepairSpecialistRunner(aiProvider, workspaceService, aiDiagnostics)); guardianService.setRepairService(guardianRepairService);
  const emmyService = new EmmyService(aiProvider); const privateEmmyService = new PrivateEmmyService(aiProvider, workspaceService, businessOsService, aiDiagnostics, undefined, blogDraftActions, seoMetadataActions, pageContentActions, frontendSourceActions, backendSourceActions, guardianService);
  const workspaceNotificationService = new WorkspaceNotificationService(new FirebaseWorkspaceNotificationRepository(), workspaceService, new DiagnosticsWorkspaceHealthEvidenceCollector(aiDiagnostics), new AnalyticsWorkspaceHealthAnalyzer(aiProvider));
  const workspaceTaskService = new WorkspaceTaskService(new FirebaseWorkspaceTaskRepository(), workspaceService, privateEmmyService, aiDiagnostics);
  guardianService.setTaskService(workspaceTaskService); guardianRepairService.setTaskService(workspaceTaskService);
  const workspaceAutomationRepository = new FirebaseWorkspaceAutomationRepository();
  const workspaceAutomationService = new WorkspaceAutomationService(workspaceAutomationRepository, workspaceService);
  const workspaceAutomationRunner = new WorkspaceAutomationRunner(workspaceAutomationRepository, workspaceTaskService, `api-${process.pid}`);
  return { tokenVerifier: new FirebaseTokenVerifier(), businessRepository: new FirebaseBusinessRepository(), paymentProvider: provider, paymentService: new PaymentService(new FirebasePaymentRepository(), provider, parsedOrigin.origin, (payment) => projectService.activateFromPayment(payment)), emmyService, privateEmmyService, conversationService: new ConversationService(new FirebaseConversationRepository(), workspaceService, emmyService, privateEmmyService), blogDraftActions, pageMetadataService, seoMetadataActions, pageContentService, pageContentActions, frontendSourceActions, backendSourceActions, aiDiagnostics, workspaceNotificationService, workspaceTaskService, workspaceAutomationService, workspaceAutomationRunner, guardianService, emmyRateLimiter: new InMemoryRateLimiter(), privateEmmyRateLimiter: new RateLimiter(new InMemoryRateLimitStore(), 30, 60_000, "PRIVATE_EMMY_RATE_LIMITED", "Private Emmy is receiving too many requests. Please try again shortly."), checkoutRateLimiter: new RateLimiter(new InMemoryRateLimitStore(), 10, 60_000, "CHECKOUT_RATE_LIMITED", "Too many checkout requests. Please try again later."), projectAccessRateLimiter: new RateLimiter(new InMemoryRateLimitStore(), 5, 5 * 60_000, "PROJECT_ACCESS_RATE_LIMITED", "Too many access attempts. Please try again later."), projectService, projectRepository, capabilities: buildCapabilityRegistry(process.env), workspaceService, businessOsService };
}

export function createRequestHandler(
  config: AppConfig,
  dependencies: AppDependencies = defaultDependencies(),
) {
  const workspaceNotificationService = dependencies.workspaceNotificationService ?? new WorkspaceNotificationService(config.environment === "test" ? new MemoryWorkspaceNotificationRepository() : new FirebaseWorkspaceNotificationRepository(), dependencies.workspaceService);
  const workspaceTaskService = dependencies.workspaceTaskService ?? new WorkspaceTaskService(config.environment === "test" ? new MemoryWorkspaceTaskRepository() : new FirebaseWorkspaceTaskRepository(), dependencies.workspaceService, dependencies.privateEmmyService, dependencies.aiDiagnostics);
  const workspaceAutomationService = dependencies.workspaceAutomationService ?? new WorkspaceAutomationService(config.environment === "test" ? new MemoryWorkspaceAutomationRepository() : new FirebaseWorkspaceAutomationRepository(), dependencies.workspaceService);
  dependencies.conversationService.setNotificationService(workspaceNotificationService);
  dependencies.conversationService.setDiagnosticsStore(dependencies.aiDiagnostics);
  return async function handler(req: IncomingMessage, res: ServerResponse) {
    const startedAt = Date.now();
    const requestId = String(req.headers["x-request-id"] ?? randomUUID()).slice(0, 128);
    let authenticated = false;
    let completed = false;
    const originalEnd = res.end.bind(res);
    res.end = ((...args: Parameters<ServerResponse["end"]>) => {
      const result = originalEnd(...args);
      if (!completed) {
        completed = true;
        const path = new URL(req.url ?? "/", "http://localhost").pathname;
        log("info", "request_completed", { requestId, method: req.method, route: path, statusCode: res.statusCode, durationMs: Date.now() - startedAt, authenticated });
      }
      return result;
    }) as ServerResponse["end"];
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store");
    const origin = req.headers.origin;
    if (origin && config.allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-Id");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    }
    if (origin && !config.allowedOrigins.includes(origin)) {
      sendJson(res, 403, failure("CORS_ORIGIN_DENIED", "The browser origin is not allowed.", requestId)); return;
    }
    if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }

    const url = new URL(req.url ?? "/", "http://localhost");
    log("info", "request", { requestId, method: req.method, path: url.pathname });

    try {
      if (req.method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, success({ status: "ok" as const, service: "averon-api", runtime: "local" }, requestId)); return;
      }
      if (req.method === "GET" && url.pathname === "/ready") {
        const state = readiness(dependencies.capabilities);
        sendJson(res, state.status === "not_ready" ? 503 : 200, success(state, requestId)); return;
      }
      if (req.method === "GET" && url.pathname === "/api/v1/version") {
        sendJson(res, 200, success({ service: "averon-api", version: config.version, environment: config.environment ?? "development", ...(config.build ? { build: config.build } : {}), runtimeStartedAt: API_RUNTIME_STARTED_AT, actionRuntimeFingerprint: ACTION_RUNTIME_FINGERPRINT, actionDependencyFingerprint: ACTION_DEPENDENCY_FINGERPRINT, blogUpdateAdapterFingerprint: BLOG_UPDATE_ADAPTER_FINGERPRINT }, requestId)); return;
      }
      if (req.method === "POST" && url.pathname === "/api/v1/webhooks/stripe") {
        const signature = Array.isArray(req.headers["stripe-signature"]) ? req.headers["stripe-signature"][0] : req.headers["stripe-signature"];
        const result = await handleStripeWebhook(await readBody(req, STRIPE_WEBHOOK_BODY_LIMIT), signature, dependencies.paymentProvider, dependencies.paymentService, requestId);
        sendJson(res, 200, success(result, requestId)); return;
      }
      if (req.method === "POST" && url.pathname === "/api/v1/public/quotes") {
        const quoteId = await dependencies.businessRepository.createQuote(null, parseQuoteSubmission(await readJson(req)));
        sendJson(res, 201, success({ quoteId }, requestId)); return;
      }
      const metadataRoute = await handlePublicPageMetadataRoute({ method: req.method ?? "GET", path: url.pathname, service: dependencies.pageMetadataService });
      if (metadataRoute) { sendJson(res, metadataRoute.status, success(metadataRoute.data, requestId)); return; }
      const contentRoute = await handlePublicPageContentRoute({ method: req.method ?? "GET", path: url.pathname, service: dependencies.pageContentService });
      if (contentRoute) { sendJson(res, contentRoute.status, success(contentRoute.data, requestId)); return; }
      if (req.method === "POST" && url.pathname === "/api/v1/emmy/messages") {
        const clientKey = String(req.headers["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "unknown").split(",")[0].trim();
        try { await dependencies.emmyRateLimiter.check(clientKey); }
        catch (caught) { logAiOperation({ requestId, success: false, rateLimitRejected: true, errorCode: "EMMY_RATE_LIMITED" }); throw caught; }
        const data = await dependencies.emmyService.send(parseEmmyInput(await readJson(req, EMMY_BODY_LIMIT)), requestId);
        sendJson(res, 200, success(data, requestId)); return;
      }

      const requestContext: RequestContext = { requestId, request: req, response: res };
      const auth = await requireAuthentication(requestContext, dependencies);
      authenticated = true;

      if (req.method === "GET" && url.pathname === "/api/v1/session") {
        sendJson(res, 200, sessionResponse(auth, requestId)); return;
      }
      if (req.method === "GET" && url.pathname === "/api/v1/admin/session") {
        sendJson(res, 200, adminSessionResponse(auth, requestId)); return;
      }
      const diagnosticMatch = /^\/api\/v1\/admin\/ai\/diagnostics(?:\/([^/]+))?$/.exec(url.pathname);
      if (req.method === "GET" && diagnosticMatch) {
        if (auth.user.role !== "owner" && auth.user.role !== "admin") throw new ApiError(403, "PLATFORM_ADMIN_REQUIRED", "Platform administrator access is required.");
        if (diagnosticMatch[1]) { const item = await dependencies.aiDiagnostics.get(decodeURIComponent(diagnosticMatch[1])); if (!item) throw new ApiError(404, "AI_DIAGNOSTIC_NOT_FOUND", "The AI diagnostic was not found."); sendJson(res, 200, success(item, requestId)); return; }
        const limit = Number(url.searchParams.get("limit") ?? 25); sendJson(res, 200, success({ items: await dependencies.aiDiagnostics.list(Number.isFinite(limit) ? limit : 25) }, requestId)); return;
      }
      if (req.method === "GET" && url.pathname === "/api/v1/workspaces") {
        sendJson(res, 200, success(await dependencies.workspaceService.list(auth), requestId)); return;
      }
      const agentCatalogRoute = await handleAgentCatalogRoute({ method: req.method ?? "GET", path: url.pathname, auth, service: new AgentCatalogService(dependencies.workspaceService) });
      if (agentCatalogRoute) { sendJson(res, agentCatalogRoute.status, success(agentCatalogRoute.data, requestId)); return; }
      const permissionsRoute = await handleWorkspacePermissionsRoute({ method: req.method ?? "GET", path: url.pathname, auth, service: new WorkspacePermissionProjectionService(dependencies.workspaceService) });
      if (permissionsRoute) { sendJson(res, permissionsRoute.status, success(permissionsRoute.data, requestId)); return; }
      const runsRoute = await handleWorkspaceRunsRoute({ method: req.method ?? "GET", path: url.pathname, query: url.searchParams, auth, service: new WorkspaceRunsService(dependencies.workspaceService, dependencies.aiDiagnostics) });
      if (runsRoute) { sendJson(res, runsRoute.status, success(runsRoute.data, requestId)); return; }
      if (dependencies.guardianService && url.pathname.includes("/guardian/")) {
        const guardianRoute = await handleGuardianRoute({ method: req.method ?? "GET", path: url.pathname, body: req.method === "POST" ? await readJson(req) : {}, auth, requestId, service: dependencies.guardianService });
        if (guardianRoute) { sendJson(res, guardianRoute.status, success(guardianRoute.data, requestId)); return; }
      }
      if (url.pathname.includes("/tasks")) {
        const taskRoute = await handleWorkspaceTaskRoute({ method: req.method ?? "GET", path: url.pathname, query: url.searchParams, body: req.method === "POST" || req.method === "PATCH" ? await readJson(req) : {}, auth, service: workspaceTaskService });
        if (taskRoute) { sendJson(res, taskRoute.status, success(taskRoute.data, requestId)); return; }
      }
      if (url.pathname.includes("/automations")) {
        const automationRoute = await handleWorkspaceAutomationRoute({ method: req.method ?? "GET", path: url.pathname, body: req.method === "POST" || req.method === "PATCH" ? await readJson(req) : {}, auth, service: workspaceAutomationService });
        if (automationRoute) { sendJson(res, automationRoute.status, success(automationRoute.data, requestId)); return; }
      }
      if (url.pathname.startsWith("/api/v1/workspace-notifications") || /\/health-reviews$/.test(url.pathname)) {
        const notificationRoute = await handleWorkspaceNotificationRoute({ method: req.method ?? "GET", path: url.pathname, query: url.searchParams, body: req.method === "POST" || req.method === "PATCH" ? await readJson(req) : {}, auth, requestId, service: workspaceNotificationService });
        if (notificationRoute) { sendJson(res, notificationRoute.status, success(notificationRoute.data, requestId)); return; }
      }
      if (url.pathname.includes("/blog-drafts")) {
        const blogRoute = await handleBlogDraftRoute({ method: req.method ?? "GET", path: url.pathname, body: req.method === "POST" || req.method === "PATCH" ? await readJson(req) : {}, auth, service: dependencies.blogDraftActions, requestId });
        if (blogRoute) { sendJson(res, blogRoute.status, success(blogRoute.data, requestId)); return; }
      }
      const conversationStreamMatch = /^\/api\/v1\/emmy\/conversations\/([^/]+)\/messages\/stream$/.exec(url.pathname);
      if (req.method === "POST" && conversationStreamMatch) {
        const conversationId = decodeURIComponent(conversationStreamMatch[1]); const body = await readJson(req, EMMY_BODY_LIMIT); const controller = new AbortController();
        req.once("aborted", () => controller.abort()); res.once("close", () => { if (!res.writableEnded) controller.abort(); }); res.statusCode = 200; res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8"); res.setHeader("Cache-Control", "no-cache, no-transform"); res.setHeader("X-Accel-Buffering", "no"); res.flushHeaders();
        const forwardingStarted = Date.now(); let firstForwardedAt = 0; let forwardedDeltaCount = 0; const forwardedDeltaSizes: number[] = []; const write = (event: unknown) => { if (!res.destroyed) res.write(`${JSON.stringify(event)}\n`); };
        write({ type: "started", requestId, conversationId });
        try {
          const result = await dependencies.conversationService.sendStream(auth, conversationId, body, requestId, controller.signal, (content) => { if (!firstForwardedAt) firstForwardedAt = Date.now(); forwardedDeltaCount += 1; if (forwardedDeltaSizes.length < 12) forwardedDeltaSizes.push(content.length); write({ type: "delta", requestId, conversationId, content }); }, (action, assistantMessage) => write({ type: "action_status", requestId, conversationId, action, assistantMessage }));
          log("info", "emmy_stream_forwarded", { requestId, conversationId, firstDeltaMs: firstForwardedAt ? firstForwardedAt - forwardingStarted : null, deltaCount: forwardedDeltaCount, representativeDeltaSizes: forwardedDeltaSizes, completionMs: Date.now() - forwardingStarted });
          write({ type: "completed", requestId, conversationId, ...result }); res.end();
        } catch (caught) {
          const error = caught instanceof ApiError ? caught : new ApiError(500, "INTERNAL_ERROR", "An internal error occurred."); write({ type: "interrupted", requestId, conversationId, code: error.code, message: error.message }); res.end();
        }
        return;
      }
      if (url.pathname.startsWith("/api/v1/emmy/conversations") || /^\/api\/v1\/workspaces\/[^/]+\/emmy\/conversations$/.test(url.pathname)) {
        const conversationRoute = await handleConversationRoute({ method: req.method ?? "GET", path: url.pathname, body: req.method === "POST" ? await readJson(req, EMMY_BODY_LIMIT) : {}, auth, service: dependencies.conversationService, requestId });
        if (conversationRoute) { sendJson(res, conversationRoute.status, success(conversationRoute.data, requestId)); return; }
      }
      const privateEmmyMatch = /^\/api\/v1\/workspaces\/([^/]+)\/emmy\/messages$/.exec(url.pathname);
      if (req.method === "POST" && privateEmmyMatch) {
        const workspaceId = decodeURIComponent(privateEmmyMatch[1]);
        const workspace = await dependencies.workspaceService.requirePermission(auth, workspaceId, "emmy:use");
        try { await dependencies.privateEmmyRateLimiter.check(`${auth.user.userId}:${workspaceId}`); }
        catch (caught) { logAiOperation({ requestId, channel: "private", authenticated: true, workspaceId, businessId: workspace.business.id, success: false, rateLimitRejected: true, errorCode: "PRIVATE_EMMY_RATE_LIMITED" }); throw caught; }
        const data = await dependencies.privateEmmyService.send(auth, workspaceId, parseEmmyInput(await readJson(req, EMMY_BODY_LIMIT)), requestId);
        sendJson(res, 200, success(data, requestId)); return;
      }
      if (url.pathname.includes("/business-os")) {
        const businessOsRoute = await handleBusinessOsRoute({ method: req.method ?? "GET", path: url.pathname, body: req.method === "POST" || req.method === "PATCH" ? await readJson(req) : {}, auth, service: dependencies.businessOsService });
        if (businessOsRoute) { sendJson(res, businessOsRoute.status, success(businessOsRoute.data, requestId)); return; }
      }
      if (req.method === "GET" && url.pathname.startsWith("/api/v1/workspaces/")) {
        const workspaceId = decodeURIComponent(url.pathname.slice("/api/v1/workspaces/".length));
        const context = await dependencies.workspaceService.resolve(auth, workspaceId);
        sendJson(res, 200, success({ workspace: context.workspace, business: context.business, role: context.role, permissions: context.permissions }, requestId)); return;
      }
      if (req.method === "POST" && url.pathname === "/api/v1/admin/workspaces/bootstrap") {
        if (auth.user.role !== "owner") throw new ApiError(403, "PLATFORM_OWNER_REQUIRED", "Platform owner access is required.");
        const created = await dependencies.workspaceService.repositoryForRoutes().bootstrapOwner(auth.user.userId);
        sendJson(res, 200, success({ created }, requestId)); return;
      }
      const memberMatch = /^\/api\/v1\/admin\/workspaces\/([^/]+)\/members(?:\/([^/]+))?$/.exec(url.pathname);
      if (memberMatch && req.method === "GET") {
        await dependencies.workspaceService.requirePermission(auth, decodeURIComponent(memberMatch[1]), "workspace:manage");
        sendJson(res, 200, success({ items: await dependencies.workspaceService.repositoryForRoutes().listMembers(decodeURIComponent(memberMatch[1])) }, requestId)); return;
      }
      if (memberMatch && req.method === "POST" && !memberMatch[2]) {
        sendJson(res, 201, success(await dependencies.workspaceService.addMember(auth, decodeURIComponent(memberMatch[1]), await readJson(req)), requestId)); return;
      }
      if (memberMatch && req.method === "PATCH" && memberMatch[2]) {
        const workspaceId = decodeURIComponent(memberMatch[1]); const actor = await dependencies.workspaceService.requirePermission(auth, workspaceId, "workspace:manage"); const body = await readJson(req) as Record<string, unknown>;
        if (!body || Object.keys(body).some((key) => !["role", "status"].includes(key)) || (body.role !== undefined && !["owner", "admin", "member", "viewer"].includes(String(body.role))) || (body.status !== undefined && !["active", "disabled"].includes(String(body.status)))) throw new ApiError(400, "INVALID_MEMBERSHIP", "A valid role or status is required.");
        if (body.role === "owner" && actor.role !== "owner") throw new ApiError(403, "PRIVILEGE_ESCALATION_DENIED", "Only a workspace owner may grant owner access.");
        const item = await dependencies.workspaceService.repositoryForRoutes().updateMember({ membershipId: decodeURIComponent(memberMatch[2]), workspaceId, role: body.role as "owner" | "admin" | "member" | "viewer" | undefined, status: body.status as "active" | "disabled" | undefined, actorId: auth.user.userId });
        sendJson(res, 200, success(item, requestId)); return;
      }
      const isProjectFileUpload = req.method === "POST" && /^\/api\/v1\/admin\/projects\/[^/]+\/files$/.test(url.pathname);
      const requestBody = req.method === "POST" || req.method === "PATCH" ? await readJson(req, isProjectFileUpload ? 14 * 1024 * 1024 : JSON_BODY_LIMIT) : {};
      const projectRoute = await handleProjectRoute({ method: req.method ?? "GET", path: url.pathname, body: requestBody, auth, service: dependencies.projectService, repository: dependencies.projectRepository, limiter: dependencies.projectAccessRateLimiter });
      if (projectRoute) { sendJson(res, projectRoute.status, success(projectRoute.data, requestId)); return; }
      if (req.method === "POST" && url.pathname === "/api/v1/payments/checkout") await dependencies.checkoutRateLimiter.check(auth.user.userId);
      const paymentRoute = await handlePaymentRoute({ method: req.method ?? "GET", path: url.pathname, body: requestBody, auth, service: dependencies.paymentService, requestId });
      if (paymentRoute) { sendJson(res, paymentRoute.status, success(paymentRoute.data, requestId)); return; }
      const businessRoute = await handleBusinessRoute({
        method: req.method ?? "GET", path: url.pathname,
        body: requestBody,
        auth, repository: dependencies.businessRepository,
        activateContract: (id, customerId) => dependencies.projectService.activateContract(id, customerId),
      });
      if (businessRoute) { sendJson(res, businessRoute.status, success(businessRoute.data, requestId)); return; }
      sendJson(res, 404, failure("NOT_FOUND", "The requested endpoint does not exist.", requestId));
    } catch (caught) {
      if (caught instanceof ApiError) {
        sendJson(res, caught.status, failure(caught.code, caught.message, requestId, caught.details)); return;
      }
      log("error", "request_failed", { requestId, errorCode: "INTERNAL_ERROR" });
      sendJson(res, 500, failure("INTERNAL_ERROR", "An internal error occurred.", requestId));
    }
  };
}
