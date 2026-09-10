# Backend migration status

_Updated 2026-08-13. “Migrated” means the authoritative foundation is owned by `averon-api`; it does not mean every business workflow already uses it._

| Responsibility | Status | Current location / note |
|---|---|---|
| Firebase Admin initialization | MIGRATED | `apps/averon-api/src/services/firebase/admin.ts`; no frontend/Vite server owner remains |
| Firebase ID-token verification | MIGRATED | `apps/averon-api/src/services/auth/authentication.ts` |
| Safe user session | MIGRATED | `GET /api/v1/session` |
| Admin authorization | MIGRATED FOUNDATION | Enforces existing `role: owner/admin` custom claims at `GET /api/v1/admin/session`; business admin commands remain legacy |
| Permission checks | MIGRATED FOUNDATION | Central server helpers exist; no migrated business command consumes them yet |
| Workspace membership | MIGRATED FOUNDATION | Server-owned businesses/workspaces/memberships, role-derived permissions, owner bootstrap, isolation, listing/detail and minimal management APIs |
| Firestore Admin service | MIGRATED FOUNDATION | Controlled document/query/transaction/timestamp helpers; business repositories are intentionally deferred |
| Stripe Checkout and webhooks | MIGRATED | averon-api payment domain and Stripe adapter; legacy Vite plugin is inactive |
| DeepSeek website generation | MIGRATED | averon-api provider abstraction and DeepSeek adapter |
| Existing website Emmy | MIGRATED | Public UI uses typed `/api/v1/emmy/messages`; UI behavior preserved |
| API runtime health/readiness | HARDENED | `/health` liveness, `/ready` capability readiness, structured completion/provider logs, bounded shutdown |
| Rate limiting | DISTRIBUTED-READY INTERFACE | In-memory store remains per instance; shared store required before multi-instance scaling |
| Emmy orchestration | NOT IMPLEMENTED | Contracts only |
| Email sending | LEGACY/UNIMPLEMENTED | Environment names/template drafts exist; no sender implementation found |
| Customers | MIGRATED | Existing admin list uses the API; auth-profile self-upsert remains frontend-safe/owner-scoped |
| Quotes | MIGRATED | Authenticated submission and admin reply transaction use the API |
| Contracts | MIGRATED | Assignment and owner signing use the API; realtime owner reads remain client-side |
| Messages | MIGRATED | Admin read/update operations use the API; owner realtime reads remain |
| Notifications | PARTIAL | Owner/admin API exists; current realtime owner read UI remains client-side |
| Invoices and payments | MIGRATED | API owns checkout, owner status, provider-neutral reconciliation and admin reads |
| Projects and blog management | NOT_IMPLEMENTED | Source-managed content; no real Firestore domain exists |
| Business OS | MIGRATED FOUNDATION | Workspace-scoped structured containers, classified/versioned sections, decisions, retrieval service, typed APIs and Emmy App inspection |
| Private Emmy | MIGRATED READ-ONLY | Authenticated workspace route, bounded role-filtered Business OS context, separate prompt/rate limit, safe AI telemetry, and Emmy App chat |
| Emmy orchestration | MIGRATED READ-ONLY | Deterministic planner, enabled-agent registry, structured tasks/results, five specialist workers, dependency execution, validation, and final Emmy synthesis |
| AI quality and diagnostics | MIGRATED READ-ONLY | Versioned worker schemas, one-pass repair, provenance/citations, deterministic eval runner, normalized statuses, and bounded admin diagnostics |
| AI grounding and golden evals | MIGRATED READ-ONLY | Claim-level authorized source validation, opaque request-local references, unsupported-claim filtering, eight offline golden fixtures, and replaceable privacy-safe diagnostics storage |
| Agent capability/readiness | MIGRATED READ-ONLY | Six real skill definitions, five standardized active AgentSpecs, indexed 100-definition capacity, structured readiness, capability resolution, smallest-team selection, and unchanged execution limits |
| Initial Emmy swarm | MIGRATED READ-ONLY | Fifteen active certified AgentSpecs, sixteen registered skills, ten new versioned schemas, dynamic collaboration, risk-based Critic verification, safe swarm metrics, and unchanged global execution limits |
| Swarm quality evaluation | VALIDATED READ-ONLY | Forty-seven deterministic Phase 16 stress checks, structured contradiction and partial-failure safety metadata, failure corpus, scorecard, overlap/skill-gap analysis, and unchanged 15-agent roster/limits |
| Altrex Code, Website Builder | NOT STARTED | Explicitly outside current scope; no active execution/integration |

## Stripe boundary

Stripe SDK and private-key operations exist only in averon-api. The root Vite Stripe plugin is not registered and its historical body is inert pending deletion after review of the uncommitted migration series.
