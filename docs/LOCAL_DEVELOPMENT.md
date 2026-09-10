# Local development

## Requirements and installation

- Node.js 22 or newer (the API development command uses Node's TypeScript type stripping; validation used Node 25).
- npm, using the committed `package-lock.json`.

Run `npm install` from the repository root. Copy only the example appropriate to each app and fill values locally; never commit real `.env` files.

## Environment setup

- Root `.env`: averon-web Firebase client, publishable Stripe value, and `VITE_AVERON_API_BASE_URL` settings only. Public `VITE_*` values are browser-visible.
- `apps/emmy-app/.env`: frontend-safe Firebase client values and `VITE_AVERON_API_BASE_URL` only.
- `apps/averon-api/.env`: server runtime, allowed origins, Firebase Admin configuration, and all backend-private integration variables. Root Vite has no server integration middleware.

Default ports are averon-web `5173`, emmy-app `5174`, and averon-api `8787`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev:averon` | Existing Averon site/admin |
| `npm run dev:emmy` | Private Emmy shell |
| `npm run dev:api` | Central API |
| `npm run dev:all` | All three local processes on strict ports 5173, 5174, and 8787 |
| `npm run typecheck` | All TypeScript projects |
| `npm run lint` | Repository ESLint |
| `npm test` | Available workspace tests |
| `npm run build` | Production builds for all three applications |

`npm run dev` remains an alias for averon-web to preserve the original workflow.

## Health and routes

With the API running, `GET http://localhost:8787/health`, `GET /ready`, and `GET /api/v1/version` are public. Health reports process liveness; readiness reports safe capability states and returns 503 when Firebase/Firestore core readiness is unavailable. `GET /api/v1/session` returns safe authenticated identity data. `GET /api/v1/admin/session` also enforces the existing owner/admin custom claim. Public website Emmy is active at `POST /api/v1/emmy/messages` when DeepSeek is configured.

Authenticated workspace access is available at `GET /api/v1/workspaces` and `GET /api/v1/workspaces/:workspaceId`. A platform owner may explicitly and idempotently initialize the three canonical workspaces with `POST /api/v1/admin/workspaces/bootstrap`; this never runs automatically. Emmy App stores its selected authorized workspace ID in session storage and sends private chat through the authorized workspace route.

Workspace owners/admins can idempotently initialize an empty Business OS with `POST /api/v1/workspaces/:workspaceId/business-os`; authenticated reads use the corresponding metadata, sections, and decisions endpoints. Emmy App exposes `/workspaces/:workspaceId/business-os` for authorized inspection. No initial business facts are seeded and public Emmy remains independent.

Private Emmy uses `POST /api/v1/workspaces/:workspaceId/emmy/messages` from the authenticated Emmy App. Owner, admin, and member roles with `emmy:use` receive only Business OS context visible to their role. The public Emmy route remains independent. Chat history is session-only and isolated by workspace.

Phase 11 keeps that route and chat unchanged while adding internal deterministic planning. Explicit research, SEO, writing, analytics, or documentation requests may use an enabled read-only worker before Emmy produces one final response. `DEEPSEEK_API_KEY` remains server-only. There are no worker routes, frontend selectors, mutation tools, browsing, email, Altrex, code execution, or deployment integration.

Run `npm run eval` for Phase 12 deterministic orchestration fixtures; they use fake metadata and no network/provider calls. Private answers may show authorized Business OS source chips. Platform owners/admins can inspect safe per-instance metadata at `/diagnostics`; it never includes prompts, messages, context bodies, worker output, or answers.

Phase 4 business routes require averon-api to be running for contact quote submission, admin business lists/replies, contract assignment/signing, and message updates. Errors remain visible through the existing page error states; no direct privileged fallback is performed.

## Environment ownership

| Classification | Variables |
|---|---|
| Frontend public | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_AVERON_API_BASE_URL` |
| Backend private | `FIREBASE_SERVICE_ACCOUNT_JSON`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DEEPSEEK_API_KEY` |
| Backend configuration | `PORT`, `API_VERSION`, `API_BUILD`, `NODE_ENV`, `LOG_LEVEL`, `CORS_ALLOWED_ORIGINS`, `SHUTDOWN_TIMEOUT_MS`, `FIREBASE_PROJECT_ID`, `DEEPSEEK_MODEL`, `DEEPSEEK_API_BASE_URL`, `DEEPSEEK_TIMEOUT_MS`, `STRIPE_TIMEOUT_MS` |
| Deployment-only | `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_CONFIG`, `GOOGLE_CLOUD_PROJECT` |
| Unknown / requires later feature review | `RESEND_API_KEY` (no active sender implementation was found) |
| Obsolete | None confirmed; values are not removed until their owners are proven unused |

Set `PAYMENT_FRONTEND_ORIGIN` to the exact averon-web origin. Stripe should forward signed events to `POST /api/v1/webhooks/stripe`. Checkout and status routes require the existing Firebase login.

Public Emmy and private Emmy require `DEEPSEEK_API_KEY`; `DEEPSEEK_API_BASE_URL`, `DEEPSEEK_MODEL`, and `DEEPSEEK_TIMEOUT_MS` are optional server settings. Their routes and knowledge boundaries remain separate.

## Common failures

- **API unavailable:** confirm port 8787 and that both frontend origins are in `CORS_ALLOWED_ORIGINS`.
- **API authentication rejected:** provide Firebase Admin application-default credentials for the same Firebase project used by the frontend.
- **Emmy login configuration error:** copy all Firebase client variable names from the app example.
- **Readiness is degraded/not ready:** inspect capability codes and configure Firebase Admin plus only the optional providers the deployment intends to enable. Values are never returned.
- **Firestore permission error:** verify custom claims and deployed rules; do not weaken rules to bypass the error.
- **Port in use:** change `PORT` for the API and keep frontend API base URLs synchronized; Vite ports can be overridden on the command line.

## Validation record (2026-08-13)

- `npm install --ignore-scripts`: passed; workspace links installed, no new runtime library was introduced beyond existing tooling.
- `npm run typecheck`: passed for averon-web, emmy-app, and averon-api.
- `npm run lint`: passed with no findings.
- `npm test`: passed; averon-api 122/122 tests, emmy-app 0 tests. Phase 13 adds opaque-reference, claim attribution, tenant-isolation, unsupported-claim, diagnostics-interface, retention, and redaction coverage. Emmy App has no DOM harness; its typed citation and diagnostics paths are covered by typecheck/build.
- `npm run eval`: passed 10/10 orchestration fixtures and 8/8 golden fixtures with zero prohibited-agent activations.
- `npm run build`: passed for averon-web, emmy-app, and averon-api. Averon-web emitted a chunk-size warning (934.06 kB minified), not a build failure; emmy-app built at 348.85 kB minified.
- `npm ls --all --omit=optional`: passed. Optional-platform packages reported as unmet are Vite/plugin optional dependencies, not broken required dependencies.
- Frontend bundle scan for Firebase Admin, Stripe secret, DeepSeek key, Google credentials, and the DeepSeek server endpoint names: no matches.
- Workspace import inspection found one-way frontend → api-client and API → shared contract dependencies; no circular workspace dependency was found.
- Credential-free runtime smoke test: `/health` returned `ok`; `/ready` returned `degraded` with Firebase/Firestore initialized and optional payments/Emmy disabled; `/api/v1/version` returned only service/version/environment; SIGINT closed cleanly. No external provider or Firestore operation was made.

The route trees, admin/auth/Emmy modules, and public assets all compile in the averon-web production build. Live browser interaction with Firebase, Stripe, DeepSeek, or production services was not executed because it would require credentials or external actions. API behavior is tested through the in-memory HTTP handler and both frontend session integrations compile successfully.

## Phase 13 local checks

Run `npm run eval:golden` for the offline claim-grounding fixtures, or `npm run eval` for both orchestration and golden suites. Neither command needs credentials or makes network calls. Optional diagnostics retention settings are `AI_DIAGNOSTICS_MAX_ENTRIES` (default 100) and `AI_DIAGNOSTICS_RETENTION_DAYS` (default 7); invalid or out-of-range values are safely bounded. See `PHASE_13_GROUNDING_AND_GOLDEN_EVALS.md` for the trust boundary and baseline-review policy.
