# Phase 16: swarm quality, stress evaluation, and intelligence validation

## Scope and outcome

Phase 16 evaluates and hardens the Phase 14–15 capability/readiness architecture; it does not expand it. Emmy remains the only visible AI.

- Production specialists: **15**
- Capacity: **approximately 100 registered specifications**
- New agents added in Phase 16: **0**
- Active tools, mutation rights, email, deployment, Altrex, and external business integrations added: **0**

The roster remains Research, SEO, Blog/Writing, Analytics, Documentation, Frontend Development, Backend Development, Database, Testing/QA, Security, Business Operations, Marketing, Sales, Customer Operations, and Critic/Verifier.

## Evaluation methodology and scenarios

`npm run eval:swarm-quality` extends the existing offline evaluation infrastructure. It uses 47 deterministic checks: 18 capability/team scenarios, four contradiction cases, eight Critic outcomes, five execution claims, three-workspace grounding and isolation checks, five partial-failure cases, plus malformed output, provider readiness, fake provenance, unsupported live data, and 100-candidate/small-team checks. Existing orchestration, golden, and Phase 15 swarm suites remain intact.

Each team fixture declares required capabilities, acceptable teams, prohibited agents, Critic policy, maximum team size, and whether the current call budget should leave the request unresolved. Scenarios cover direct Emmy; frontend/accessibility; backend/database; authentication/security; backend/database/testing; four-role feature architecture; a secure bounded feature; Marketing/SEO/content; Sales/Customer Operations; Operations/Analytics; Research/Marketing; Business OS documentation; high-impact business review; and unsupported live research.

The checked-in failure corpus covers over-selection, under-selection, contradictions, fake provenance, unsupported live claims, execution claims, malformed output, unnecessary/missing Critic, and workspace contamination.

## Deterministic scorecard and acceptance criteria

| Metric | Result | Acceptance |
|---|---:|---:|
| Capability selection accuracy | 18/18 | 18/18 |
| Required skill coverage | 17/18 | 17/18 plus explicit budget-unresolved handling |
| Team precision | 18/18 | 18/18 |
| Unnecessary-agent rate | 0/29 selections | 0 |
| Critic trigger precision | 18/18 | 18/18 |
| Critic outcome accuracy | 8/8 | 8/8 |
| Dependency correctness | 18/18 | 18/18 |
| Contradiction detection/resolution | 4/4 | 4/4 |
| Unsupported claim/provenance rejection | 2/2 | 2/2 |
| Business OS grounding compliance | 3/3 | 3/3 |
| Tenant-isolation compliance | 3/3 | **100% required** |
| Partial-failure behavior | 5/5 | 5/5 |
| Execution-right enforcement | 5/5 | **100% required** |
| Budget compliance | 18/18 | 18/18 |
| Needs-input correctness | 3/3 | 3/3 |
| Direct-Emmy classification | 18/18 | 18/18 |

Unauthorized/restricted Business OS prevention and cross-workspace provenance rejection also require 100%. No probabilistic confidence values are used.

## Direct Emmy, team precision, and budgets

Four ordinary context, clarification, and underspecified fixtures take the zero-worker path. The focused corpus has a 0.28 direct-Emmy rate and average selected team size of 1.61; these describe fixture composition, not production traffic. The 100-candidate test still selects one sufficient worker, so registry capacity does not expand execution.

Limits remain unchanged: four specialist tasks, four specialist provider calls, five total calls including synthesis, and dependency depth three. The Marketing+SEO+Blog fixture exposes an intentional boundary: SEO and Blog each retain a two-call repair allowance, so their worst-case total plus Marketing exceeds four specialist calls. The resolver safely reports the requirements unresolved and runs no partial team. Phase 16 does not increase the budget or silently omit a capability to force 18/18 coverage.

## Contradiction behavior and Critic effectiveness

Structured contradiction metadata contains only subject, conflicting result IDs/values, evidence references, and resolution status—never prompts, raw output, or hidden reasoning. A uniquely grounded position is preferred; conflicting positions without decisive evidence produce `needs_input`. Majority voting is not used.

Critic cases cover PASS, PASS_WITH_WARNINGS, REVISE for requirements/contradictions/incomplete security, NEEDS_INPUT for missing evidence, and REJECT for execution or cross-workspace evidence. All eight passed. All 18 Critic trigger expectations passed, with no fixture-level false positive or missed intervention.

## Partial failures and safe synthesis

The shared safety assessment distinguishes optional failure, required failure, Critic failure, and needs-input. Optional failure may permit bounded partial synthesis. Required or Critic failure marks synthesis unsafe; Emmy is explicitly instructed not to replace missing required analysis with guesses and to provide only independently supported, bounded information. Dependency failures remain explicit. Malformed output after repair is rejected. Provider unavailability yields no candidate and a readiness failure.

## Grounding and tenant isolation

Averon Technologies, Movento, and Lumora appear only in local fixtures. Same-workspace claims produced expected citations and every cross-workspace claim was rejected. Worker source references must belong to the request-local authorized set. Business OS visibility, restricted access, workspace authorization, and skill requirements remain server-authoritative. Ryan Jewelry remains excluded.

Safe diagnostics now add contradiction count, Critic invoked, partial-failure count, budget status, and safe-synthesis status. They do not store prompts, Business OS content, raw worker output, answers, credentials, or hidden reasoning.

## Agent utilization

Focused-corpus selection counts: Research 2, SEO 1, Blog 0, Analytics 1, Documentation 1, Frontend 2, Backend 5, Database 4, Testing 2, Security 2, Business Operations 1, Marketing 2, Sales 2, Customer Operations 1, Critic 3. Blog is zero here because its three-domain case is budget-unresolved; it remains exercised by preserved Phase 15 suites. Counts are not production demand or quality estimates.

## Capability overlap analysis

Intentional overlap exists at governed handoffs: Backend/Security, Marketing/SEO/Blog, Operations/Analytics, Sales/Customer Operations, Research/downstream consumers, and primary specialists/Critic. Ownership remains distinct. There are no duplicate registered skill IDs or duplicate primary skill owners.

Potentially harmful overlap is limited mainly to keyword classification around broad concepts such as conversion, workflow, data, and authentication. Compound planner phrases reduce accidental activation. No AgentSpec was merged or removed; further semantic planner improvements require real workload evidence.

## Skill-gap analysis

| Unsupported capability | Frequency | Disposition |
|---|---:|---|
| Controlled live web research | 2 | Future governed source/tool decision; Research returns needs-input today |
| Qualified legal advice | 1 | Human-qualified review, not automatic expansion |
| Visual asset generation | 1 | Future governed media capability |

The Marketing+SEO+Blog result is a budget limitation, not a missing specialist. Current evidence does not justify agent 16.

## Remaining limitations and roadmap handoff

Capability planning is keyword-based; semantic contradiction identification depends on structured claims or Critic output; offline tests do not establish live-model quality; diagnostics remain instance-local; and one three-domain content team exceeds the conservative repair budget.

After Phase 16, work returns to the existing Averon production/testing roadmap: controlled end-to-end and Firebase/Auth checks, Firestore rules/index deployment, workspace and Business OS initialization, controlled real DeepSeek tests, Stripe test-mode validation, staging/deployment, then separately governed Movento/Lumora integrations, controlled Emmy actions, email/communications, Website Builder/templates, and future Altrex work. No deployment or external call occurred.

## Validation record

- `npm run typecheck`: passed for Averon Web, Emmy App, and Averon API.
- `npm run lint`: passed with zero errors or warnings.
- `npm test`: Averon API 142/142 passed; Emmy App 0 tests.
- `npm run eval`: orchestration 10/10, golden 8/8, Phase 15 swarm 12/12, and Phase 16 quality 47 checks passed.
- `npm run eval:golden`: 8/8 passed independently.
- `npm run eval:swarm`: 12/12 passed independently; registry count 15, unresolved skills 0, prohibited expansion 0.
- `npm run eval:swarm-quality`: passed; exact scorecard is above.
- `npm run build`: all three production builds passed. Averon Web emitted the existing non-fatal 935.33 kB minified chunk warning; Emmy App's largest JavaScript chunk was 183.28 kB; API TypeScript build passed.
- `npm ls --all --omit=optional`: exited successfully; displayed unmet entries are optional platform/preprocessor dependencies.
- `git diff --check`: passed.
- Security scans confirmed 15 active specs, zero disallowed execution rights/tools, only `ai.text_generation`, strict frontend Emmy input fields (`message` and `history`), no credential-pattern match in the Phase 16 scope, and server-authoritative routing/readiness/grounding.

No evaluation used a live provider. No Stripe, email, Altrex, Movento/Lumora application, mutation, deployment, or other external call was made.
