# Phase 15: initial 15-agent Emmy swarm

## Scope

Phase 15 extends the Phase 14 capability/readiness architecture. Emmy remains the only visible AI and is not counted as a specialist. Public Emmy remains independent. The production registry contains exactly 15 enabled specialist specifications; request execution remains a zero-to-four-agent subset. The registry architecture and Phase 14 test retain capacity for approximately 100 specifications.

No agent can write repositories or Business OS records, execute code, deploy, publish, contact customers, send/read email, change quotes/contracts/payments, call Altrex, or modify external Movento/Lumora applications.

## Roster, skills, and boundaries

| Agent | Primary skill | Risk | Boundary |
|---|---|---|---|
| Research | `research.internal_synthesis` | low | Supplied/internal synthesis; no browsing |
| SEO | `seo.content_strategy`, `seo.metadata` | low | Search strategy/metadata; no live metrics |
| Blog/Writing | `content.blog_drafting` | moderate | Drafting only; no publishing |
| Analytics | `analytics.interpretation` | moderate | Supplied data only; missing data produces `needs_input` |
| Documentation | `documentation.sop_drafting` | moderate | Documentation drafts; no file writes |
| Frontend Development | `development.frontend_analysis` | moderate | Architecture, React/TypeScript, UI, accessibility, performance, debugging recommendations |
| Backend Development | `development.backend_architecture` | moderate | APIs, server logic, auth, integrations, debugging recommendations |
| Database | `database.schema_design` | moderate | Models, queries, indexes, migrations, consistency; no operations |
| Testing/QA | `quality.test_strategy` | moderate | Tests, regression, E2E, edge cases, acceptance criteria; no execution |
| Security | `security.architecture_review` | high | Defensive authorization, tenancy, API, configuration, exposure, and threat review |
| Business Operations | `operations.workflow_analysis` | moderate | Workflows, process, SOP, coordination, optimization |
| Marketing | `marketing.strategy` | moderate | Positioning, campaigns, acquisition, messaging, conversion; SEO remains with SEO |
| Sales | `sales.strategy` | moderate | Leads, proposals, quotation strategy, conversion, journey; no customer/commercial action |
| Customer Operations | `customer.operations` | moderate | Request/support analysis, communication drafts, escalation; no sending/mutation |
| Critic/Verifier | `verification.independent_review` | high | Independent verification only; never the primary answer |

All 15 have only `read`, `analyze`, `draft`, and `recommend` execution rights, require `emmy:use`, declare no tools, use the current provider abstraction, require structured output, and must have a registered skill plus matching passed schema certification.

## Schemas and validation

Every worker has a versioned `.v1` output schema. Existing five schemas are unchanged. The nine new primary specialists use bounded arrays for findings, recommendations, risks, assumptions, and missing information. The Critic uses:

- verdict: `PASS`, `PASS_WITH_WARNINGS`, `REVISE`, `REJECT`, or `NEEDS_INPUT`;
- findings, contradictions, missing evidence, requirement violations, risk concerns, and recommended revisions.

Hidden-reasoning fields are rejected. Every result must match task identity and schema version. Supplied provenance references must all belong to the authorized request-local source set; an invented or cross-workspace reference invalidates the result. The common validator rejects mutation claims and context mismatch, and bounded one-pass formatting repair remains unchanged.

## Planning, selection, and collaboration

The deterministic planner emits skill requirements, not agent IDs. Phase 14 readiness and capability resolution choose eligible agents. The smallest-team selector remains bounded by four agents, four specialist provider calls, and the existing five-call total including final Emmy synthesis. Dependency depth remains three.

Examples:

- Business OS lookup → direct Emmy, zero specialists.
- Frontend review → Frontend only.
- SEO article → SEO then Blog.
- Backend plus database design → Backend and Database.
- Secure backend API → Backend and Security, followed by Critic.
- Marketing content → Marketing and Blog.
- Operations analysis with metrics → Business Operations and Analytics.

There is no permanent development or business swarm and no majority voting. Structured upstream results are the only collaboration channel.

## Verification policy

Verification is deterministic and risk-based. Security, authentication/authorization, payments, database migrations, explicitly high-impact business decisions, and explicit verification requests reserve a Critic skill. The Critic runs after all selected primary tasks and receives their validated structured outputs as dependencies. Normal validation remains sufficient for trivial direct answers and ordinary low/moderate-risk drafting.

The Critic prioritizes evidence, provenance, contradictions, requirements, and specialist relevance. `REVISE`, `REJECT`, and `NEEDS_INPUT` are interventions conveyed to final Emmy synthesis; agreement counts are not used as truth.

## Business OS and grounding

Context retrieval remains centralized in private Emmy. Agents receive only the role-visible, workspace-authorized, bounded sections chosen for the request. New agents cannot query arbitrary data. Worker provenance and Phase 13 claim-level final-answer grounding both use opaque request-local source references. Public Emmy has no access to this path.

## Diagnostics and swarm metrics

Privacy-safe diagnostics now include requested/covered/unresolved skills, candidate and selected team size, selected IDs, task dependencies, verification requirement, verifier verdict, task completion/failure counts, verifier intervention count, needs-input count, provider calls, duration, tokens, attribution state, and unsupported-claim count.

They still exclude prompts, messages, Business OS content, raw worker output, final answers, credentials, and hidden reasoning. These fields support later measurement of frequent/rare agents, overlap, skill gaps, verifier revision/rejection frequency, needs-input rate, latency, and call usage without inventing a quality score.

## Evaluation strategy and limits

`npm run eval:swarm` runs 12 offline fixtures covering direct Emmy, SEO, SEO→Blog, frontend, backend/database, backend/security, development/testing, marketing/content, operations/analytics, required verification, unsupported live research, and tenant-isolation posture. `npm run eval` includes orchestration, golden, and swarm suites. No live provider is called.

The main limitations are keyword-based capability planning, one general analysis schema shared by nine bounded advisory roles, model-produced semantic review, per-instance diagnostics/rate limits, and no live-provider quality evidence. The next step is evaluation of real authorized workloads—not adding agent 16.

## Validation record (2026-08-23)

- Typecheck and lint passed.
- API tests passed 138/138; Emmy App has 0 automated DOM tests.
- Capability-aware orchestration evals passed 10/10 with zero prohibited-agent activation.
- Golden grounding evals passed 8/8.
- Swarm evals passed 12/12; production registry assertion reported 15, unresolved skills 0, and prohibited expansion 0.
- All three production builds passed. Averon Web retained its existing non-fatal 935.33 kB minified chunk warning; Emmy App's largest JavaScript chunk was 183.28 kB.
- Required dependency validation exited successfully; reported unmet packages are optional platform/preprocessor dependencies.
- No live provider, Stripe, email, Altrex, Movento/Lumora, deployment, or other external call was made.

## Roadmap preservation

The swarm adds to, and does not replace, Averon production work, Movento, Lumora, Website Builder/templates, controlled future Emmy actions, email/communications, or future Altrex integration. Those remain separately governed roadmap items. No external project was accessed or modified in this phase.
