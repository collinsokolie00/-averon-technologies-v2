export type WorkspaceTaskStatus = "TODO" | "IN_PROGRESS" | "AWAITING_APPROVAL" | "BLOCKED" | "COMPLETED" | "CANCELLED";
export type WorkspaceTaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export interface WorkspaceTask {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  status: WorkspaceTaskStatus;
  priority: WorkspaceTaskPriority;
  assignedAgentIds: string[];
  linkedRunIds: string[];
  linkedActionIds: string[];
  lastRunId?: string;
  lastExecutionStatus?: "RUNNING" | "AWAITING_APPROVAL" | "COMPLETED" | "BLOCKED";
  lastExecutionSummary?: string;
  createdBy: string;
  updatedBy: string;
  version: number;
  dueAt?: string;
  completedAt?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
export interface WorkspaceTaskExecutionResult { taskId: string; runId: string; status: "IN_PROGRESS" | "AWAITING_APPROVAL" | "COMPLETED" | "BLOCKED"; idempotentReplay: boolean; actionId?: string; summary: string }
export interface WorkspaceTaskHistoryItem { id: string; workspaceId: string; taskId: string; eventType: "task.created" | "task.updated" | "task.status_changed" | "task.assignment_changed" | "task.execution_started" | "task.execution_finished"; actorId: string; changedFields: string[]; fromStatus?: WorkspaceTaskStatus; toStatus?: WorkspaceTaskStatus; runId?: string; actionId?: string; version: number; occurredAt?: unknown }
export interface WorkspaceTaskDetail extends WorkspaceTask { history: WorkspaceTaskHistoryItem[] }
export interface WorkspaceTasksResponse { workspace: { id: string; name: string }; canManage: boolean; items: WorkspaceTask[]; agentIdentities: Record<string, { displayName: string; displayRole: string }> }
