# Phase 7: Durable Workspace Automations

Workspace Automations are durable, workspace-scoped schedule definitions stored in Firestore `workspaceAutomations`. Occurrence ownership and idempotency are stored separately in `workspaceAutomationOccurrences`; a deterministic occurrence key and durable lease ensure competing runner ticks cannot create duplicate Tasks.

The only operation is `CREATE_TASK`. The runner delegates creation to the existing `WorkspaceTaskService`, using a deterministic Task ID for crash recovery. An Automation, its occurrence, and its resulting Task retain separate identities and lifecycle authority. Assigned specialist IDs are validated against the production agent registry but are organizational metadata only: creation never invokes a specialist, creates a Run or Authorized Action, grants approval, or calls an AI provider.

Schedules support ONCE, DAILY, and WEEKLY with an explicit valid IANA timezone. Durable `nextRunAt` is authoritative; process timers are not. Disabled definitions have no due occurrence. Updates require `expectedVersion` and recompute only future occurrences.

The API enforces `workspace:read` for list/detail and `workspace:manage` for create/update. Records, history, and occurrence state are workspace-scoped. The UI keys all state by workspace so list, selection, edit draft, and pending async responses cannot leak across workspace changes.

This domain does not replace or modify the existing workspace health schedule. It adds no agent execution, source/content action, approval authority, deployment, publishing, customer messaging, or arbitrary tool capability.
