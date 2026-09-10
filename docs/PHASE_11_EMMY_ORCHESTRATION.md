# Phase 11 Emmy orchestration

Phase 11 extends the existing authenticated private Emmy request internally. Emmy remains the only visible assistant and the only private route remains `POST /api/v1/workspaces/:workspaceId/emmy/messages`. There are no public worker endpoints, worker selectors, specialist chats, mutation tools, or recursive planning.

## Flow and planner

After Firebase authentication and the existing active workspace/business/membership and `emmy:use` checks, private Emmy retrieves a bounded, role-filtered Business OS context. A deterministic `TaskPlanner` classifies explicit request language. Simple Business OS questions remain on the direct Emmy path. Research, SEO, writing, analytics, and documentation language produces structured `TaskPlan`/`PlannedTask` records with stable task IDs, objectives, dependencies, required context section types, expected output, and required/optional dependency policy.

The planner uses no model call and cannot recurse. A combined SEO/blog request creates SEO first and makes the blog task depend on that structured result. Plans are capped at four specialist tasks.

## Registry and enabled workers

The central registry uses the pre-existing `@averon/agent-contracts` package. Definitions include stable ID, name, description, capabilities, allowed task types, required permissions, read/write classification, provider/model metadata, execution limit, output schema, approval policy, and enabled state.

Enabled, read-only workers:

- `research`: synthesizes supplied/internal context, identifies gaps, and returns `externalResearchRequired` for current external research.
- `seo`: produces keyword, intent, title/meta, structure, and internal SEO recommendations without claiming live volume or ranking data.
- `blog`: drafts blogs, articles, landing pages, social copy, and rewrites; it never publishes.
- `analytics`: interprets real supplied or authorized internal data and returns `needs_input` when data is absent.
- `documentation`: drafts SOPs, reports, summaries, and technical/business documentation without file or code changes.

Disabled workers are product, image, customer support, coding, deployment, testing, translation, marketing, and sales. No Altrex adapter is registered. Customer support remains disabled because future customer-message or email access is outside this phase.

## Task and result contracts

Each worker receives an `AgentTask` containing server-resolved workspace/business identity, objective, input, relevant authorized sections, structured upstream results, constraints, approval policy, and expected output. It returns a provider-neutral `AgentResult` with task/agent identity, `completed`, `failed`, or `needs_input` status, summary, optional output/warnings/missing information, and a safe error when applicable.

Workers receive only the context already filtered by `BusinessOsService.getBusinessContext`; they cannot query Firestore or expand visibility. Members receive public/internal context, while workspace owners/admins may receive restricted context. Viewers retain the Phase 8 policy and cannot use private Emmy. Selected context is bounded to eight section types and twelve active records. No whole-database or automatic whole-Business-OS payload exists.

## Orchestrator, dependencies, and validation

The central `AgentOrchestrator` validates that an agent is enabled, read-only, allowed for its task type, and compatible with `emmy:use`. It executes tasks in deterministic dependency order. A failed required dependency blocks its dependent; an optional dependency can yield a partial result. Invalid cycles/dependencies and excess depth fail safely. Workers cannot invoke the orchestrator or other workers, and upstream output is JSON-serialized as untrusted data beneath immutable worker security rules.

The deterministic validator checks task and agent identity, status/summary shape, prohibited execution or mutation claims, and unsupported live-data claims. Malformed output becomes a failed result rather than raw model content. Emmy receives only validated results and synthesizes one final answer; raw specialist transcripts and the internal trace are not returned to the client. If a worker fails or needs input, Emmy can explain the limitation and provide a safe partial response.

## Provider limits, cost metadata, and observability

All workers and final synthesis reuse the existing provider-neutral `AiProvider` instance and current DeepSeek adapter. There is no duplicate client and no OpenAI/Anthropic dependency. Conservative limits are four specialist tasks, five provider calls total including final Emmy synthesis, dependency depth three, and no recursive planning.

An in-memory per-request trace records request/workspace IDs, task/agent IDs, statuses, durations, specialist call count, and token usage when supplied by the provider. Safe AI operation logs add planner outcome, statuses, duration, calls, and usage. Full prompts, Business OS content, messages, results, credentials, and tokens are not logged or persisted. Existing user/workspace private Emmy rate limiting remains unchanged; no billing is implemented.

## UI and public Emmy

Emmy App remains one workspace-aware chat and retains its neutral “Emmy is thinking…” state. It receives one final reply and no agent IDs or traces. No new DOM stack was introduced; the existing lightweight test command, typecheck, and production build validate the frontend.

Public Emmy retains its independent route, prompt, provider call, body contract, and lack of authentication. It never invokes the planner, registry, orchestrator, workers, or Business OS.

## Read-only guarantee and limitations

No worker can update Business OS, customers, quotes, contracts, payments, websites, files, repositories, or external applications. No tools are registered. Email, Altrex, browsing, publishing, code execution, GitHub, hosting, and deployment remain inactive. Movento and Lumora application systems were not contacted or changed; Ryan Jewelry remains excluded.

Classification is keyword-based and worker output is JSON parsed rather than schema-constrained at provider transport level. Research has no live web source, SEO has no ranking/search-volume source, and analytics is limited to supplied or authorized context. Traces are operational logs only, not a durable diagnostics product.

## Recommended next phase

The next phase should strengthen read-only quality and evaluation: versioned JSON schemas, deterministic citations to safe Business OS section labels, orchestration eval fixtures, and an authorized internal diagnostics view. It should not introduce mutations or external actions until separate approval, audit, idempotency, and human-confirmation controls exist.
