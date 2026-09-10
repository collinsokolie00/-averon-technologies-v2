import type { WorkspaceAutomation, WorkspaceAutomationHistoryItem } from "@averon/shared-types";
export interface AutomationOccurrence { id: string; workspaceId: string; automationId: string; scheduledFor: string; status: "LEASED" | "TASK_CREATED" | "FAILED"; leaseOwner: string; leaseUntil: string; createdTaskId?: string; safeErrorCode?: string }
export interface WorkspaceAutomationRepository {
  list(workspaceId: string): Promise<WorkspaceAutomation[]>; get(workspaceId: string, id: string): Promise<WorkspaceAutomation | null>;
  create(input: Omit<WorkspaceAutomation, "version" | "createdAt" | "updatedAt">): Promise<WorkspaceAutomation>;
  update(workspaceId: string, id: string, expectedVersion: number, patch: Partial<WorkspaceAutomation>, actorId: string, eventType?: WorkspaceAutomationHistoryItem["eventType"]): Promise<WorkspaceAutomation>;
  history(workspaceId: string, id: string): Promise<WorkspaceAutomationHistoryItem[]>; due(now: string): Promise<WorkspaceAutomation[]>;
  acquireOccurrence(automation: WorkspaceAutomation, scheduledFor: string, owner: string, leaseUntil: string): Promise<boolean>;
  finishOccurrence(automation: WorkspaceAutomation, scheduledFor: string, result: { status: "TASK_CREATED"; taskId: string } | { status: "FAILED"; safeErrorCode: string }, nextRunAt?: string): Promise<void>;
}
