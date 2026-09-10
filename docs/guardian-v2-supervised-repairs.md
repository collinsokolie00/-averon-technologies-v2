# Guardian v2 Phase 1: supervised repairs

Guardian repair plans are durable, workspace-scoped records in `guardianRepairPlans`. A plan links an existing Guardian finding and report to an existing Authorized Action proposal; it does not contain or execute arbitrary source edits.

The lifecycle is server-authoritative and versioned. Explicit current approval is required before execution. Supported source repairs delegate to the existing frontend/backend source-action services, including their authorization, original-hash check, bounded apply, validation, read-back, and rollback behavior. Unsupported findings remain non-executable recommendations.

The stable `repairPlanId` is also the Diagnostics operation identity. Findings close only after the linked action completes and deterministic Probe verification passes. Guardian retains read/analyze/draft/recommend authority; no deployment, publishing, shell, self-approval, or autonomous Task execution is introduced.

## Phase 2 milestone 1: bounded ordered plans

A Phase 2 repair plan contains one or two ordered steps. Each step references an existing registered frontend or backend source proposal; callers cannot supply raw mutations, resources, targets, or assertions. Dependencies must point backward to an earlier step.

Before approval, `POST /api/v1/workspaces/:workspaceId/guardian/repair-plans/:repairPlanId/simulate` resolves every proposal through the existing workspace-scoped, canonical source read-back path. Simulation rejects stale proposals, incomplete assertions, unsupported actions, and overlapping resources without approving or applying a proposal. Its SHA-256 digest binds the workspace, simulated plan version, step order and IDs, proposal IDs, action types, targets, resources, and assertions.

Approval requires that exact successful simulation. Execution requires the current plan version and matching approved digest, revalidates evidence and the proposal baseline, and advances exactly one eligible step. The step is independently verified before another step can run. Execution or verification failure stops the plan; milestone 1 adds no full-plan rollback coordinator, deployment, or specialist write authority.

## Phase 2 milestone 2: bounded step retries

Each step has at most two persisted execution attempts: the initial attempt and one retry. Guardian retries only `SOURCE_SERVICE_UNAVAILABLE`, `SOURCE_NETWORK_FAILURE`, `SOURCE_LOCK_CONTENTION`, and `SOURCE_READ_TRANSIENT`. Unknown errors and authorization, approval, workspace, evidence, proposal, digest, conflict, dependency, safety, cancellation, unsupported-operation, and verification failures are not retryable.

Before the second attempt, the synchronous coordinator rechecks workspace authorization, the current persisted plan version, the exact approved digest, current Guardian evidence, proposal compatibility, source baseline, target/resource/assertion scope, and dependency state. Drift stops the plan without a second execution. Attempt records preserve their identity, number, timestamps, outcome, failure code, approved digest, evidence revision, source revision, and verification result. There are no recursive calls, timers, background workers, approval expansion, or third attempt.

## Phase 2 milestone 3: specialist advisory aggregation

Guardian may request at most three relevant advisory contributions through the existing registered worker system. Selection starts with the plan's domain and Testing/QA specialists and may include registered Security or Critic review for higher-risk plans. Eligible workers must be enabled and limited to read, analyze, draft, and recommend rights. Contributions persist only normalized identity, plan/workspace/version linkage, advisory role, current evidence references, recommendation, bounded confidence/warnings metadata, validation result, and timestamp; raw provider payloads and executable instructions are not stored.

Guardian validates workspace, plan version, registry identity, evidence ownership/freshness, and advisory-only shape before aggregation. Invalid contributions remain auditable but are excluded. Aggregation is deterministic: any validated block produces `BLOCKED`; missing valid advice, a request for more evidence, or required plan revision produces `NEEDS_MORE_EVIDENCE`; disagreement or warnings produce `PROCEED_WITH_WARNINGS`; unanimous clean advice produces `PROCEED`. Blocking concerns are preserved rather than majority-voted away.

Advice cannot approve, execute, retry, or mutate plan scope. A blocking or insufficient-evidence assessment prevents approval and execution. Advice that requires plan changes invalidates the current simulation and approval fields, requiring the ordinary revision, simulation, and authorized approval workflow. Advice that does not change scope is deliberately excluded from the approved plan digest.
