export const notificationCategories = ["CUSTOMER_ACTIVITY", "BOOKING", "ORDER", "BUSINESS_EVENT", "WEBSITE_HEALTH", "SYSTEM_HEALTH", "AI_RECOMMENDATION", "SECURITY", "ACTION_RESULT"] as const;
export type WorkspaceNotificationCategory = typeof notificationCategories[number];
export type WorkspaceNotificationSeverity = "info" | "success" | "warning" | "critical";
export type WorkspaceNotificationStatus = "unread" | "read";
export interface WorkspaceNotificationDestination { kind: "internal"; path: string; label: string }
export interface WorkspaceNotificationRecommendation { observed: string[]; suggested: string[] }
export interface WorkspaceNotification {
  notificationId: string;
  workspaceId: string;
  businessId?: string;
  category: WorkspaceNotificationCategory;
  severity: WorkspaceNotificationSeverity;
  title: string;
  message: string;
  source: string;
  createdAt: string;
  status: WorkspaceNotificationStatus;
  readAt?: string;
  relatedEntityId?: string;
  destination?: WorkspaceNotificationDestination;
  recommendation?: WorkspaceNotificationRecommendation;
  authoritativeStatus: "observed" | "completed" | "failed" | "recommendation";
}
export interface WorkspaceHealthSchedule { workspaceId: string; weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; enabled: boolean; specialistId: "analytics" }
export interface WorkspaceHealthEvidence { websiteAvailable?: boolean; apiHealthy?: boolean; runtimeFailureCount?: number; failedOperationCount?: number; metadataIssueCount?: number }
export interface WorkspaceHealthReport { workspaceId: string; overall: "healthy" | "attention" | "critical"; observed: string[]; suggested: string[]; severity: WorkspaceNotificationSeverity; specialistId: "analytics" }
