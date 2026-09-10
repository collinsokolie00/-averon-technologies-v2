# Phase 13: grounding and golden evaluations

## Scope

Phase 13 strengthens the existing read-only private Emmy path. It does not add workers, mutations, email, Altrex Code, web browsing, or external integrations.

## Claim-level attribution

The API converts authorized Business OS retrieval results into request-local sources named `src_1`, `src_2`, and so on. These opaque references carry section type and version inside the trusted server boundary, are never stable identifiers, and cannot be used to retrieve data in a later request.

Private Emmy must return a structured reply plus individual claims. A business-specific claim must name at least one supplied Business OS source reference. General guidance must not claim a Business OS reference. The server validates every reference against the current workspace's authorized source set, drops unsupported business claims, and constructs user-visible citations only from references used by accepted claims. Worker results use the same allowlist, so a provider cannot invent provenance or cross a workspace boundary.

This is claim attribution, not proof that a model interpreted a source correctly. The trust boundary therefore remains conservative: access control and reference membership are deterministic; semantic generation remains model-produced.

## Golden evaluation suite

`npm run eval:golden` runs deterministic, credential-free fixtures for Averon branding, unavailable Movento pricing, restricted policies, SEO/blog composition, current-research limitations, unavailable analytics, tenant isolation, and business-decision grounding. Fixtures contain synthetic evaluation text only and do not create production records.

Each fixture checks expected facts, prohibited claims, planner selection, mutation absence, citation/reference behavior, and whether live external access would be required. The checked-in baseline is `evals/results/golden-baseline.json`. Changing intended behavior requires an explicit fixture and baseline review; the runner never updates the baseline itself.

## Diagnostics storage boundary

Diagnostics now depend on an asynchronous `DiagnosticsStore` interface rather than a concrete process-local implementation. The default implementation remains an allowlisted, bounded in-memory store. It records orchestration metadata, claim counts, attribution status, citation metadata, errors, provider-call counts, and aggregate token usage. It does not persist prompts, replies, source content, credentials, or authorization headers.

Retention is configurable with `AI_DIAGNOSTICS_MAX_ENTRIES` (1–500, default 100) and `AI_DIAGNOSTICS_RETENTION_DAYS` (1–90, default 7). A future durable adapter must preserve workspace authorization, the serializer allowlist, bounded retention, and deletion semantics before it can replace the default. No durable database schema or external write was added in this phase.

## Limitations and rollback

- The evaluator is deterministic and offline; it does not measure live-provider quality or latency.
- Citations point to authorized Business OS section metadata, not text spans.
- General knowledge is deliberately uncited because web retrieval is outside scope.
- The in-memory diagnostics implementation is per API process and is lost on restart.

Rollback is isolated: remove the grounding validator and golden runner, restore plain final synthesis, and bind diagnostics to the prior in-memory class. No data migration or external cleanup is required.
