# Emmy Control Center Phase 6: Durable Workspace Tasks

Phase 6 adds a human-managed, workspace-scoped Task domain. A Task tracks work; it is not an orchestration task, Diagnostics Run, or Authorized Action.

## Architecture

- Production persistence uses the Firestore `workspaceTasks` collection. Each document key combines the workspace and immutable Task ID, and each Task has a nested versioned history collection.
- Reads require the existing `workspace:read` permission. Creates and updates require the existing `workspace:manage` permission through `WorkspaceAuthorizationService`.
- Updates use optimistic concurrency through `expectedVersion` and server-authoritative lifecycle validation.
- Assigned specialists are stored by internal ID and validated through `DefaultAgentRegistry`. Display names come from the canonical agent catalog.
- Related Run and Authorized Action IDs are references only. Task status, including `AWAITING_APPROVAL`, does not authorize or execute an action.

## Phase 6 boundaries

Creating, editing, assigning, filtering, or viewing a Task is deterministic and makes no AI/provider call. Phase 6 does not add Run Now, agent execution, scheduling, recurring Tasks, Automations, deployment, publishing, or autonomous mutation.

The Emmy UI clears Task list, detail, edit, draft, and filter state by remounting the Task workspace view when the selected workspace identity changes. The server remains authoritative for workspace isolation and mutation rights.
