# Phase 8: controlled Task execution

Workspace Tasks remain durable organizational records. An owner or administrator may explicitly start an execution through `POST /api/v1/workspaces/:workspaceId/tasks/:taskId/execute`; creating, assigning, prioritizing, or automating a Task never starts execution.

The endpoint reuses `PrivateEmmyService` for planning, specialist readiness, authorization, validation, approval, action execution, and verification. Its deterministic request ID is the existing durable Diagnostics Run ID. The Task stores only references (`linkedRunIds`, `linkedActionIds`) and a privacy-safe result summary, so Task, Run, and Authorized Action identities and lifecycle authority remain separate.

The workspace Task repository atomically claims an execution using a workspace/task/idempotency-key-derived Run ID. A repeated key returns the existing attempt; a different key is rejected while an attempt is active. Advisory output completes a Task only after the existing orchestration validates it. An action-backed execution completes only when the existing action reports `completed` with `verificationStatus: passed`; pending approval maps to `AWAITING_APPROVAL`, and failures map to `BLOCKED` without fabricated completion.

Automation runners remain `CREATE_TASK` only. They do not call the controlled execution endpoint, execute agents, create Runs, or invoke Authorized Actions.
