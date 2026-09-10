# Emmy authorized blog draft actions v1

Emmy may create, read, and update unpublished blog drafts after the existing planner and specialist pipeline returns validated output. Specialists remain read-only; only the server-side action service can persist a draft.

The canonical draft repository is the Firestore `blogDrafts` collection. Each mutation is workspace-authorized with `content:manage`, uses an `actionExecutions` record for durable idempotency, and is followed by a canonical read-back that verifies the workspace, draft ID, intended fields, and unpublished state. Safe lifecycle metadata is written without prompts or blog bodies.

Publishing, deletion, arbitrary database/file writes, deployments, authentication changes, and model-directed execution remain unsupported.
