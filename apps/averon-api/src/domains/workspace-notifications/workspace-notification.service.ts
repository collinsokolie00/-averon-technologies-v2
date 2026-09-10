import { randomUUID } from "node:crypto";
import type { WorkspaceHealthEvidence, WorkspaceHealthReport, WorkspaceHealthSchedule, WorkspaceNotification, WorkspaceNotificationCategory, WorkspaceNotificationStatus } from "@averon/shared-types";
import { ApiError } from "../../errors/api-error.ts";
import type { AuthContext } from "../../services/auth/authentication.ts";
import type { WorkspaceAuthorizationService } from "../workspaces/workspace.service.ts";
import type { WorkspaceNotificationRepository } from "./workspace-notification.repository.ts";
import type { WorkspaceHealthAnalyzer } from "./analytics-health-review.ts";

const allowedDestinations = [/^\/notifications(?:$|[/?#])/, /^\/diagnostics(?:$|[/?#])/, /^\/chat(?:$|[/?#])/, /^\/workspaces\/[A-Za-z0-9_-]+(?:\/business-os)?(?:$|[/?#])/];
export function safeNotificationDestination(path: string) { return allowedDestinations.some((pattern) => pattern.test(path)) && !path.includes("..") ? path : null; }
export const workspaceHealthSchedules: readonly WorkspaceHealthSchedule[] = [
  { workspaceId: "movento", weekday: 1, enabled: true, specialistId: "analytics" },
  { workspaceId: "lumora", weekday: 2, enabled: true, specialistId: "analytics" },
  { workspaceId: "averon", weekday: 4, enabled: true, specialistId: "analytics" },
];
export interface WorkspaceHealthEvidenceCollector { collect(workspaceId: string): Promise<WorkspaceHealthEvidence> }

export class WorkspaceNotificationService {
  private readonly repository: WorkspaceNotificationRepository;
  private readonly workspaces: WorkspaceAuthorizationService;
  private readonly healthEvidence?: WorkspaceHealthEvidenceCollector;
  private readonly healthAnalyzer?: WorkspaceHealthAnalyzer;
  constructor(repository: WorkspaceNotificationRepository, workspaces: WorkspaceAuthorizationService, healthEvidence?: WorkspaceHealthEvidenceCollector, healthAnalyzer?: WorkspaceHealthAnalyzer) { this.repository = repository; this.workspaces = workspaces; this.healthEvidence = healthEvidence; this.healthAnalyzer = healthAnalyzer; }
  async list(auth: AuthContext, filters: { workspaceId?: string; category?: WorkspaceNotificationCategory; status?: WorkspaceNotificationStatus } = {}) {
    const summaries = await this.workspaces.list(auth); const allowed = new Set(summaries.items.map((item) => item.workspace.id));
    if (filters.workspaceId && !allowed.has(filters.workspaceId)) throw new ApiError(403, "WORKSPACE_ACCESS_DENIED", "Access to this workspace is not allowed.");
    let items = await this.repository.list(filters.workspaceId ? new Set([filters.workspaceId]) : allowed);
    if (filters.category) items = items.filter((item) => item.category === filters.category);
    if (filters.status) items = items.filter((item) => item.status === filters.status);
    return { items };
  }
  async setStatus(auth: AuthContext, id: string, status: WorkspaceNotificationStatus) { const item = await this.repository.get(id); if (!item) throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "The notification was not found."); await this.workspaces.requirePermission(auth, item.workspaceId, "workspace:read"); return this.repository.setStatus(id, status, status === "read" ? new Date().toISOString() : undefined); }
  async record(item: Omit<WorkspaceNotification, "notificationId" | "createdAt" | "status"> & { notificationId?: string }) { if (item.destination && !safeNotificationDestination(item.destination.path)) throw new ApiError(400, "NOTIFICATION_DESTINATION_INVALID", "The notification destination is not allowlisted."); const value: WorkspaceNotification = { ...item, notificationId: item.notificationId ?? randomUUID(), createdAt: new Date().toISOString(), status: "unread" }; return { item: value, ...(await this.repository.save(value)) }; }
  async healthReview(auth: AuthContext, workspaceId: string, requestId?: string) { const context = await this.workspaces.requirePermission(auth, workspaceId, "workspace:manage"); if (!this.healthEvidence || !this.healthAnalyzer) throw new ApiError(503, "HEALTH_REVIEW_UNAVAILABLE", "The Analytics health-review pipeline is unavailable."); const evidence = await this.healthEvidence.collect(workspaceId); const deterministic = evaluateWorkspaceHealth(workspaceId, evidence); const analysis = await this.healthAnalyzer.analyze({ requestId, workspace: { id: context.workspace.id, name: context.workspace.name }, business: { id: context.business.id, name: context.business.name }, evidence, allowedObserved: deterministic.observed }); const report: WorkspaceHealthReport = { ...deterministic, observed: analysis.observed, suggested: analysis.suggested, specialistId: "analytics" }; const recorded = await this.record({ notificationId: `health-${workspaceId}-${new Date().toISOString().slice(0, 10)}`, workspaceId, businessId: context.business.id, category: "WEBSITE_HEALTH", severity: report.severity, title: `${context.workspace.name} health review`, message: `${report.overall === "healthy" ? "Healthy" : report.overall === "critical" ? "Critical attention required" : "Review recommended"}. ${report.observed.length} observed signal(s), ${report.suggested.length} recommendation(s).`, source: "workspace.health_review.analytics", recommendation: { observed: report.observed, suggested: report.suggested }, authoritativeStatus: "recommendation", destination: { kind: "internal", path: "/diagnostics", label: "View diagnostics" } }); return { report, notification: recorded.item, created: recorded.created, providerCalls: analysis.providerCalls };
  }
}

export function evaluateWorkspaceHealth(workspaceId: string, evidence: WorkspaceHealthEvidence): WorkspaceHealthReport { const observed: string[] = []; const suggested: string[] = []; if (evidence.websiteAvailable === false) { observed.push("Website availability check failed."); suggested.push("Investigate website availability."); } if (evidence.apiHealthy === false) { observed.push("API health check failed."); suggested.push("Investigate API runtime stability."); } if ((evidence.runtimeFailureCount ?? 0) > 0) { observed.push(`${evidence.runtimeFailureCount} runtime failure(s) were supplied.`); suggested.push("Review recent runtime failures."); } if ((evidence.failedOperationCount ?? 0) > 0) { observed.push(`${evidence.failedOperationCount} authorized operation failure(s) were supplied.`); suggested.push("Review failed authorized operations."); } if ((evidence.metadataIssueCount ?? 0) > 0) { observed.push(`${evidence.metadataIssueCount} metadata issue(s) were supplied.`); suggested.push("Review canonical metadata coverage."); } const critical = evidence.websiteAvailable === false || evidence.apiHealthy === false; const overall = critical ? "critical" : observed.length ? "attention" : "healthy"; return { workspaceId, overall, observed, suggested, severity: critical ? "critical" : observed.length ? "warning" : "success", specialistId: "analytics" }; }
