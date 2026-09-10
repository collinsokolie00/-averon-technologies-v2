# Phase 7 runtime hardening

## Preflight weaknesses

Before this phase the API had liveness but no readiness probe, only port/origin environment validation, no central capability state, request-start logs without completion duration/status, a fixed in-process Emmy limiter, unrestricted handling of unknown CORS preflights, one shared body limit, and no Stripe network timeout configuration. Shutdown closed the listener but had no deadline or fatal-process policy. AI usage was normalized but not emitted as safe provider-neutral operational metadata. Payment audit records existed, while operational success/failure events were incomplete.

## Health, readiness, and capabilities

`GET /health` is a cheap process-liveness response. `GET /ready` evaluates the central registry for the real `firebase`, `firestore`, `payments`, and `emmy` capabilities. It returns `ready`, `degraded`, or `not_ready`; `not_ready` uses HTTP 503. Firebase/Firestore are core. Missing optional Stripe or DeepSeek configuration degrades or disables only that capability. Probes validate configuration and initialization availability without calling Stripe, DeepSeek, or Firestore over the network. Responses contain status codes, never values.

## Environment groups

| Group | Variables |
|---|---|
| Required for every runtime | Valid `PORT` and `CORS_ALLOWED_ORIGINS`; defaults exist for local development. Production must explicitly supply exact deployed origins. Firebase Admin credentials/project configuration are required for readiness because business APIs depend on Firebase/Firestore. |
| Stripe capability | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_FRONTEND_ORIGIN`; all three enable payments. `STRIPE_TIMEOUT_MS` defaults to 20000. |
| Emmy capability | `DEEPSEEK_API_KEY`; `DEEPSEEK_API_BASE_URL`, `DEEPSEEK_MODEL`, and `DEEPSEEK_TIMEOUT_MS` are optional and default safely. |
| Optional runtime metadata | `PORT`, `API_VERSION`, `API_BUILD`, `NODE_ENV`, `LOG_LEVEL`, `SHUTDOWN_TIMEOUT_MS`. |
| Firebase deployment alternatives | `FIREBASE_SERVICE_ACCOUNT_JSON`, `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_CONFIG`, `GOOGLE_CLOUD_PROJECT`, `FIREBASE_PROJECT_ID`. Use the hosting platform's supported credential mechanism. |
| Development-only values | Local origins `http://localhost:5173` and `http://localhost:5174`, local API port 8787, and frontend development API-base defaults. |

Malformed origins, ports, timeouts, payment origins, and inline Firebase credential JSON fail startup. Optional capability absence does not crash unrelated routes.

## Logging and observability

Logs are JSON and include timestamp, level, service, environment, event name, and relevant safe fields. HTTP completion events include request ID, method, route, status, duration, and authenticated state. Bodies, headers, documents, provider payloads, prompts, replies, cookies, and credentials are not logged; sensitive keyed fields are recursively redacted.

AI events record provider, model, duration, outcome, timeout/error category, normalized token counts when returned, rate-limit rejection, and request ID. They never persist conversations. Payment operational events cover checkout success/failure, webhook verification failure, reconciliation success/mismatch, and duplicate handling. These are separate from Phase 5 business audit records.

## Rate limits, request sizes, timeouts, and retries

The limiter now depends on `RateLimitStore.increment`. The current `InMemoryRateLimitStore` preserves 20 Emmy requests per minute per connection-derived client key. Checkout creation has a separate authenticated-user limit of 10 per minute. Stripe webhooks are not rate limited. Each API instance owns its own counters; serious horizontal scaling requires a shared/distributed store implementing the same interface.

Normal JSON is limited to 128 KiB, Emmy bodies to 32 KiB, and raw Stripe webhook bodies to 1 MiB. Raw webhook bytes remain intact for signature verification. DeepSeek and Stripe default to 20-second network timeouts. Stripe SDK network retries are disabled; Checkout already supplies an idempotency key, but the API does not blindly retry mutations or reconciliation. DeepSeek is not automatically retried, preventing retry storms and duplicate cost.

Firebase Admin/Firestore uses the Google SDK's own request deadlines and retry classification; this phase does not wrap database mutations in a second generic retry layer because doing so could repeat writes or transactions incorrectly.

## CORS and HTTP safety

Browser origins must exactly match `CORS_ALLOWED_ORIGINS`; unknown origins and their preflights receive a typed 403. Requests with no `Origin` remain available for server-to-server clients and Stripe webhooks. Responses include no-store, MIME-sniffing, referrer, and frame protections. The API does not emit a frontend CSP or identifying framework header.

## Shutdown and failure policy

SIGINT and SIGTERM stop accepting new connections and allow the Node HTTP server up to `SHUTDOWN_TIMEOUT_MS` (10 seconds by default) to close. A deadline forces a nonzero exit. Unhandled rejections and uncaught exceptions are logged using stable codes, initiate shutdown, and do not print raw error objects or continue after a potentially corrupted state.

## Local and production topology

```text
Averon Web (frontend hosting) ─┐
                              ├─ HTTPS → Averon API (long-running Node-compatible hosting)
Emmy App (frontend hosting) ──┘                  ↑
                                               Stripe webhook
```

Locally, `npm run dev:all` starts ports 5173, 5174, and 8787. Both frontend applications use `VITE_AVERON_API_BASE_URL`; localhost is a compile-time development-only fallback and is absent from production bundles. Production must set the public API HTTPS URL in both frontend builds (an absent value otherwise resolves against the frontend origin, suitable only for an intentional same-origin reverse proxy) and exact frontend origins in API CORS configuration. Stripe must target `POST /api/v1/webhooks/stripe` on that external API. Configure platform liveness at `/health` and readiness at `/ready`, and deliver SIGTERM with at least the shutdown grace period.

No hosting provider is assumed and nothing was deployed. Before multi-instance production traffic, replace the memory rate-limit store. Central log aggregation, external uptime monitoring, credential-manager provisioning, Firebase/Stripe test-mode integration, and production-origin runtime verification remain deployment responsibilities.

## Verification record

Typecheck, lint, 50 API tests, all three production builds, dependency-tree validation, whitespace checks, and frontend secret/server-module scans passed on 2026-08-13. A credential-free API smoke instance on port 8791 returned healthy, degraded-ready (Firebase/Firestore initialized; optional payments/Emmy disabled), and safe version responses. SIGINT produced `server_stopping` then `server_stopped`. No Firebase operation, Stripe call, DeepSeek call, browser UI session, deployment, or other external action was performed.
