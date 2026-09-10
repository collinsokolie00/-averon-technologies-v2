# Averon application split plan

## Selected structure

```text
apps/
  averon-api/       Central Node HTTP API foundation
  emmy-app/         Private React/Vite application
packages/
  agent-contracts/  Specialist-agent and Emmy orchestration contracts
  api-client/       Frontend-safe typed HTTP client
  auth/             Frontend-safe authentication contracts
  shared-types/     Transport-safe domain and response types
  validation/       Shared boundary validators
src/, public/       Existing averon-web (temporarily at repository root)
docs/
```

This is an npm-workspace hybrid monorepo. The original root package stays runnable as **averon-web**. A physical move to `apps/averon-web` is deferred because the working tree contains extensive application changes, route/assets are root-relative, and deployment assumptions are unknown. This minimizes migration risk while establishing real package boundaries.

## Foundation completed

- Add a separately runnable `averon-api` with health/version/session/workspaces/Emmy route foundations.
- Add `emmy-app` with existing Firebase login, protected-route structure, honest empty states, and API availability.
- Add shared transport, validation, API-client, auth, agent, and orchestration contracts.
- Configure averon-web to use the same health client without changing its visible design.
- Add root workflow scripts, safe environment examples, documentation, and a focused API health test.
- Centralize Firebase Admin, token verification, admin authorization, safe sessions, and Firestore Admin primitives in averon-api.
- Add `GET /api/v1/admin/session` and authenticated session retrieval in emmy-app.

## What remains temporarily in place

- All existing site/admin/customer routes, styling, content, assets, Firebase client access, and Emmy UI.
- Direct Firestore reads and mutations required by current customer/admin behaviour.
- Existing mock/placeholder modules, pending a separate behaviour review.

## Migration order

1. Confirm deployment runtime, Firebase project/claims, and production route behaviour.
2. Add integration tests around the existing Stripe, authentication, Firestore, and Emmy flows.
3. **Completed:** Stripe checkout/webhook endpoints migrated into averon-api with provider-neutral reconciliation and typed frontend calls.
4. Define business/workspace persistence and authorization; implement workspace membership APIs.
5. Migrate browser Firestore mutations to authorized API commands, one workflow at a time.
6. **Completed:** existing website Emmy provider and static knowledge migrated behind `/api/v1/emmy/messages`.
7. **Completed:** central API runtime hardening, readiness/capability reporting, operational observability, replaceable rate-limit storage, bounded shutdown, and deployment guidance.
8. **Completed:** multi-business tenancy for Averon Technologies, Movento, and Lumora with server-side membership authorization and Emmy App selection.
9. **Completed:** structured, visibility-aware, versioned Business OS and decisions beneath workspace authorization.
10. **Completed:** authenticated, workspace-aware, read-only private Emmy with bounded Business OS retrieval, visibility filtering, and isolated session history; no specialists or mutations.
11. **Completed:** deterministic private task planning, central read-only orchestration, five enabled recommendation workers, dependency validation, and one final Emmy response.
12. **Completed:** versioned worker schemas, bounded repair, safe Business OS citations, deterministic evals, measurable quality checks, and authorized metadata-only diagnostics.
13. **Completed:** claim-level Business OS attribution, opaque request-local source references, golden-answer regression fixtures, and a privacy-safe replaceable diagnostics boundary.
14. **Completed:** capability-first planning, indexed skill/AgentSpec registries, readiness filtering, and smallest-sufficient-team selection with capacity for approximately 100 registered definitions. The active production count remains five; the intended first swarm target is 15, with the next ten agents deferred to the next approved phase and further scale driven only by evaluations and real workloads.
15. **Completed:** the initial 15-agent read-only Emmy swarm, including nine bounded advisory specialists and a risk-triggered Critic/Verifier. Registry capacity remains approximately 100, per-request execution remains zero to four specialists, and the next step is workload/evaluation evidence rather than automatic expansion.
16. **Completed:** deterministic swarm-quality and stress evaluation for the unchanged 15-agent roster, including contradiction, Critic, grounding, tenancy, partial-failure, execution-right, budget, overlap, utilization, and skill-gap evidence. No agent, tool, provider, or action capability was added.
11. Add specialist execution only after approval/audit boundaries and private Emmy routing are verified.

Phase 4 completed the existing quote, contract, admin-message, customer/admin-list and dashboard paths. Remaining client Firestore access is owner-scoped realtime reading/profile initialization or belongs to the legacy Stripe boundary.

## Rollback approach

The original root app and its Vite middleware were not removed. Reverting the new workspace configuration, health probe, and new `apps`/`packages` directories restores the prior structure. Future endpoint migrations should be gated by environment-configured base URLs so individual calls can return to the legacy route during rollback.

## Environment and deployment implications

- averon-web and emmy-app receive only `VITE_*` Firebase client values and `VITE_AVERON_API_BASE_URL`.
- averon-api owns all server-only Firebase Admin, Stripe, DeepSeek, email-provider, and CORS environment names. Credentials should be supplied by the hosting platform or secret manager.
- Production must route or host three concerns: root static SPA, Emmy static SPA, and a long-running/serverless-compatible API. No deployment changes are included here.
- Allowed CORS origins must list the exact deployed frontend origins; wildcard origins are not used.

## Known blockers and remaining phases

The blockers in `AVERON_ARCHITECTURE_AUDIT.md` remain. In particular, workspace APIs and Emmy messages intentionally return typed `NOT_IMPLEMENTED` responses after authentication. No fake success is returned. The next phase should migrate one existing privileged vertical slice—preferably Stripe Checkout/webhooks—after the production runtime and integration-test strategy are confirmed.
