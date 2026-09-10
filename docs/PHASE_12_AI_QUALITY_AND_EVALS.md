# Phase 12 AI quality, provenance, evaluations, and diagnostics

Phase 12 strengthens read-only Emmy orchestration without adding workers, tools, external sources, or mutations.

## Weaknesses addressed and schema versioning

Phase 11 accepted broad JSON output, did not enforce worker versions or focused fields, had no repair pass, omitted per-task validation/call metadata, and lacked citations, deterministic fixtures, and diagnostics inspection.

Enabled workers now declare and return `research.v1`, `seo.v1`, `blog.v1`, `analytics.v1`, or `documentation.v1`. Every result binds exact schema version, agent ID, task ID, status, summary, output, warnings, and missing information. Focused contracts cover research findings/gaps/external-research state; SEO intent/keywords/titles/meta/outline/limitations; blog title/summary/body/slug/CTA/assumptions/gaps; analytics observations/metrics/trends/caveats/missing data/recommendations; and documentation title/purpose/sections/actions/unresolved items. Publishing fields and unsupported SEO volume are absent or rejected.

Invalid JSON produces `WORKER_JSON_PARSE_FAILED`; parseable invalid output produces `WORKER_SCHEMA_INVALID`. One temperature-zero formatting repair may run with the same task identity and no new facts. It counts toward the five-call limit; a second invalid response fails. Breaking changes require a new schema version, existing versions remain explicit, the registry declares support, and unsupported versions are rejected.

## Provenance and citations

Authorized Business OS sections retain section ID, type, version, and visibility internally. Final citations derive only from authorized sections supplied to Emmy and relevant to the request/plan. The client gets type, friendly label, and safe version—not Firestore paths, raw IDs, titles, visibility, or content. Strict input rejects client citations. Cross-workspace and restricted records cannot reach context, workers, synthesis, diagnostics, or citations. Emmy App renders compact source chips linking to the authorized Business OS view. Public Emmy has no citations.

## Evaluations and measurable metrics

`evals/orchestration` has ten fake deterministic fixtures: direct brand, SEO, blog, SEO→blog, internal research, external research required, analytics without data, documentation, cross-workspace isolation, and restricted viewer exclusion. `npm run eval` checks plans, dependencies, enabled workers, tenant isolation, visibility, citations, and prohibited agents without Firestore or DeepSeek.

Metrics are counts of plan validity, tenant isolation, visibility compliance, and prohibited-agent activation. Tests cover schema/parse failure, one-pass repair, mutation/live claims, normalized statuses, citations, and diagnostics. No subjective score is invented. Future live-provider evaluation must require `RUN_LIVE_AI_EVALS=true` and stay separate from CI.

## Status, diagnostics, and observability

Request status is `completed`, `partial`, `needs_input`, or `failed`. Mixed success is partial; exclusively missing-input results need input. Emmy still produces one final response explaining limitations.

`AiDiagnosticsStore` keeps at most 100 records per API instance by default, newest first, hard-capped at 500, and evicts old entries. It is in-memory and lost on restart/not shared across instances. Records contain IDs, time/duration, final status, plan/task metadata, per-task calls/tokens/validation, citations, safe error codes, and aggregate calls/tokens. They never include messages, prompts, Business OS content, raw worker output, final answers, credentials, or chain-of-thought. Business audit remains separate.

Platform owner/admin endpoints are `GET /api/v1/admin/ai/diagnostics?limit=…` and `GET /api/v1/admin/ai/diagnostics/:requestId`. Emmy App shows `/diagnostics` only for admin sessions; the API is authoritative. DeepSeek usage is normalized to input/output/total tokens when present. No monetary cost is calculated.

## Security, limitations, and next phase

The worker set remains Research, SEO, Blog/Writing, Analytics, and Documentation. No mutations, browsing, email, Altrex, coding, testing, deployment, customer support, external business connections, or Ryan Jewelry scope were added. The frontend cannot select workers or submit citations.

Validation is intentionally handwritten rather than a large schema dependency. Citations identify supplied relevant context but are not yet claim-level markers. Diagnostics are per-instance/non-durable, and planner routing remains keyword-based. The recommended next phase is read-only claim-level citation/evaluation and a decision on privacy-preserving centralized diagnostics; mutations remain deferred pending human approval, idempotency, audit, and rollback design.
