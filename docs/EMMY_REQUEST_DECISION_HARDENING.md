# Emmy request-decision hardening

Private Emmy now applies one deterministic, current-turn request decision before any domain action resolver may construct or approve a mutation. The decision distinguishes advisory/read-only work, mutation requests, approval responses, unresolved targets, and unsupported intent; it also records the resolved target, requested outcome, prohibited operations, capability, approval requirement, confidence, and safe reason codes.

Chat and controlled Task execution share this boundary because both execute through `PrivateEmmyService.send`. Conversation history may resolve an artifact or proposal target only after the current turn supplies explicit mutation or approval authority. A current negative instruction wins over history. Scoped restrictions such as `do not publish` or `do not deploy` remain compatible with an explicitly requested unpublished draft or review-only source proposal, while broad instructions such as `do not modify anything` prevent action construction.

The change does not add an orchestrator, agent, action, permission, provider, or autonomous right. Existing capability readiness, synthesis validation and bounded repair, durable approval state, apply/read-back verification, idempotency, Diagnostics, Task reconciliation, and mounted-chat lifecycle remain authoritative.
