# Guardian v2 Phase 1: supervised repairs

Guardian repair plans are durable, workspace-scoped records in `guardianRepairPlans`. A plan links an existing Guardian finding and report to an existing Authorized Action proposal; it does not contain or execute arbitrary source edits.

The lifecycle is server-authoritative and versioned. Explicit current approval is required before execution. Supported source repairs delegate to the existing frontend/backend source-action services, including their authorization, original-hash check, bounded apply, validation, read-back, and rollback behavior. Unsupported findings remain non-executable recommendations.

The stable `repairPlanId` is also the Diagnostics operation identity. Findings close only after the linked action completes and deterministic Probe verification passes. Guardian retains read/analyze/draft/recommend authority; no deployment, publishing, shell, self-approval, or autonomous Task execution is introduced.
