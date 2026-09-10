# Phase 14: agent capability and readiness architecture

## Scope and continuity

Phase 14 extends the Phase 10–13 private Emmy orchestration path. Public Emmy, workspace tenancy, Business OS authorization, grounding, schemas, provider workers, diagnostics, evaluations, Movento/Lumora roadmap items, Website Builder, email, and future Altrex integration remain separate and unchanged. Emmy is still the only user-visible AI.

The production registry contains exactly five active workers: Research, SEO, Blog/Writing, Analytics, and Documentation. No production specification exists for the next ten planned agents and no action tool was introduced.

## Standardized AgentSpec

`AgentSpec` separates identity from capability. A specification declares identity/version/domain, skills and task types, provider/model/tool requirements, permissions and Business OS access, risk and execution rights, execution mode, coarse cost, call/runtime budgets, input/output schemas, verification policy, enablement/experimental state, readiness requirements, and evaluation certification metadata.

The current five declare only the existing text-generation provider capability, structured output, no tools, `emmy:use`, internal Business OS access, validator-only verification, and the execution rights `read`, `analyze`, `draft`, and `recommend`. They cannot prepare or execute actions. Dollar/token pricing is deliberately absent.

The registry uses maps indexed by ID, skill, and domain. Registration stores specifications only; it does not instantiate workers or load prompts. The runtime constructs a worker only after an authorized plan selects that specification. A deterministic test registers 100 test-only definitions; they never enter the production registry.

## Skills

Phase 14 registers only six skills derived from real behavior:

- `research.internal_synthesis`
- `seo.content_strategy`
- `seo.metadata`
- `content.blog_drafting`
- `analytics.interpretation`
- `documentation.sop_drafting`

The Skill Registry supports ID/domain lookup, requirement inspection, known-skill validation, agent mapping, and capable-agent discovery. Skill identity is never accepted from frontend input.

## Readiness and capability resolution

Readiness states are `READY`, `DEGRADED`, `NOT_READY`, `DISABLED`, and `EXPERIMENTAL`. The engine checks only local metadata: enablement, known skills, declared provider/tool/model capabilities, schema certification, and certification status. It makes no provider or external health call and returns structured reasons/missing requirements without configuration values.

Workspace skill readiness additionally requires an enabled ready agent, authoritative workspace permission, permitted risk, registered skill, and declared runtime requirements. Experimental and not-ready agents are excluded from production resolution.

The planner now first produces required skill IDs and context-section requirements. The Capability Resolver finds eligible specs. A deterministic greedy selector repeatedly chooses the candidate covering the most unresolved required skills, then prefers fewer provider calls, lower cost class, and stable ID ordering. It stops at the unchanged limits and reports unresolved skills rather than expanding the swarm.

The team plan records requested skills, selected agents, skill coverage, unresolved skills, warnings, expected risk/provider calls, and candidate count. The existing orchestrator then receives ordinary structured tasks and preserves dependency handling, schemas, validation, repair, citations, and final Emmy synthesis. SEO remains a required upstream dependency of Blog when both skills are requested.

## Limits and security

- Maximum specialist tasks/agents per request: 4.
- Maximum total provider calls including final Emmy synthesis: 5.
- Maximum dependency depth: 3.
- Active agent maximum provider calls: 2 each, still bounded by the request budget.
- No recursion, freeform agent chat, frontend agent/skill selection, readiness mutation, external browsing, email, code execution, deployment, payments, Business OS writes, or other mutations.

Safe diagnostics add requested skills, candidate count, selected agent IDs, readiness failure codes, skill coverage, unresolved skills, and team size. They still exclude prompts, messages, Business OS content, worker output, answers, credentials, and hidden reasoning.

## Evaluation and capacity

Offline tests validate specs, skills, indexed registries, all readiness states, missing providers/skills, certification failure, permissions/risk, resolver behavior, smallest sufficient teams, unresolved skills, budgets, and a 100-definition test registry. Orchestration evals now measure skill coverage, smallest-team size, readiness filtering, and direct-answer behavior alongside tenancy, visibility, and prohibited-agent checks.

## Roadmap

Phase 14 is an extension of the existing roadmap:

- System capacity target: approximately 100 registered agent specifications.
- Initial swarm target: 15 active agents.
- Active count after Phase 14: 5.
- Next phase may add, subject to separate approval and evaluations: Frontend Development, Backend Development, Database, Testing/QA, Security, Business Operations, Marketing, Sales, Customer Operations, and Critic/Verifier.
- Scale beyond 15 only when deterministic/live evaluations and real workload requirements justify it.

The next phase must not automatically grant tools or execution rights. Each new agent requires a real schema, skills, readiness/certification evidence, permission/risk review, test coverage, and explicit activation decision.

## Validation record (2026-08-23)

- Typecheck and lint passed.
- API tests passed 131/131; Emmy App has 0 automated DOM tests.
- Capability-aware orchestration evals passed 10/10 with complete plan validity, skill coverage, smallest-team, readiness-filtering, direct-answer, tenant-isolation, and visibility counts; prohibited-agent activation was zero.
- Golden evals passed 8/8, both through `npm run eval` and independently through `npm run eval:golden`.
- All three production builds passed. Averon Web retained its existing non-fatal 935.33 kB minified chunk warning; Emmy App's largest emitted JavaScript chunk was 183.28 kB.
- Required dependency validation exited successfully; reported unmet dependencies are optional platform/preprocessor packages.
- `git diff --check`, production active-agent count, credential-pattern scan, and forbidden action/tool scan passed. No live provider, Stripe, Altrex, Movento/Lumora, or other external call was made.
