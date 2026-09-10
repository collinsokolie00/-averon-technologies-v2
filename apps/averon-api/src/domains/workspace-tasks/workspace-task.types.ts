import type { WorkspaceTask, WorkspaceTaskHistoryItem } from "@averon/shared-types";
export interface WorkspaceTaskFilters { status?: WorkspaceTask["status"]; priority?: WorkspaceTask["priority"]; assignedAgentId?: string }
export interface WorkspaceTaskRepository {
  list(workspaceId: string, filters?: WorkspaceTaskFilters): Promise<WorkspaceTask[]>;
  get(workspaceId: string, taskId: string): Promise<WorkspaceTask | null>;
  create(input: Omit<WorkspaceTask, "version" | "createdAt" | "updatedAt">): Promise<WorkspaceTask>;
  update(workspaceId: string, taskId: string, expectedVersion: number, patch: Partial<Pick<WorkspaceTask, "title" | "description" | "status" | "priority" | "assignedAgentIds" | "dueAt" | "completedAt">>, actorId: string): Promise<WorkspaceTask>;
  history(workspaceId: string, taskId: string): Promise<WorkspaceTaskHistoryItem[]>;
  beginExecution(workspaceId: string, taskId: string, runId: string, actorId: string): Promise<{ task: WorkspaceTask; started: boolean }>;
  finishExecution(workspaceId: string, taskId: string, runId: string, status: "AWAITING_APPROVAL" | "COMPLETED" | "BLOCKED", actionId: string | undefined, summary: string, actorId: string): Promise<WorkspaceTask>;
  reconcileActionExecution(workspaceId: string, taskId: string, actionId: string, status: "IN_PROGRESS" | "COMPLETED" | "BLOCKED", summary: string): Promise<WorkspaceTask>;
}
