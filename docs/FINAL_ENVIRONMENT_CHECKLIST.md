# Final environment checklist

Use separate local, test, and production values. Never commit `.env` files, service-account JSON, Stripe secrets, webhook secrets, Firebase ID tokens, or provider keys.

## Frontend public configuration

Copy `.env.example` to `.env` for Averon Web and `apps/emmy-app/.env.example` to `apps/emmy-app/.env` for Emmy App.

| Variable | Required | Purpose |
|---|---:|---|
| `VITE_FIREBASE_API_KEY` | yes | Firebase browser application key; public by design |
| `VITE_FIREBASE_AUTH_DOMAIN` | yes | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | yes | Must match the API's Firebase project |
| `VITE_FIREBASE_STORAGE_BUCKET` | if Storage UI is used | Firebase browser storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | yes | Firebase browser application metadata |
| `VITE_FIREBASE_APP_ID` | yes | Firebase browser application ID |
| `VITE_AVERON_API_BASE_URL` | yes for separate hosting | `http://localhost:8787` locally; public HTTPS API origin in deployed builds |

These values are included in browser bundles and must not contain private credentials. Stripe Checkout is server-created and redirected by URL; no Stripe secret or publishable key is required by the current frontend implementation.

## Firebase Admin

Configure one supported credential path in the API environment:

| Variable | Use |
|---|---|
| `FIREBASE_PROJECT_ID` | Explicit project ID, strongly recommended |
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute path to a local service-account file; do not use in browser apps |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Inline service account for a secret manager/runtime that requires it |
| `FIREBASE_CONFIG` | Hosting-provided Firebase configuration |
| `GOOGLE_CLOUD_PROJECT` | Hosting-provided project identity |

Prefer application-default/workload identity in production. The Admin project must match both frontend Firebase projects. Enable Email/Password authentication and Google authentication only if those login methods are intended. Add deployed frontend domains to Firebase Auth authorized domains.

## Stripe test mode

| Variable | Required for payment testing | Purpose |
|---|---:|---|
| `STRIPE_SECRET_KEY` | yes | Stripe **test-mode** secret key (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | yes | Signing secret from the test endpoint or `stripe listen` (`whsec_…`) |
| `PAYMENT_FRONTEND_ORIGIN` | yes | Exact Averon Web origin, with no path |
| `STRIPE_TIMEOUT_MS` | no | 1000–120000; default 20000 |

Webhook endpoint: `POST {PUBLIC_API_URL}/api/v1/webhooks/stripe`. Never use live keys or a real card during readiness testing.

## DeepSeek

| Variable | Required for Emmy testing | Purpose |
|---|---:|---|
| `DEEPSEEK_API_KEY` | yes | Server-only provider credential |
| `DEEPSEEK_API_BASE_URL` | no | Default `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | no | Default `deepseek-chat` |
| `DEEPSEEK_TIMEOUT_MS` | no | 1000–120000; default 20000 |

Use one deliberately bounded public question and one private direct Business OS question first. Confirm diagnostics/token metadata and provider billing before worker tests. Do not enable live evaluation loops.

## API runtime

| Variable | Required | Purpose |
|---|---:|---|
| `PORT` | no | Default 8787 |
| `NODE_ENV` | production deployment | Runtime mode |
| `API_VERSION` | no | Safe version response metadata |
| `API_BUILD` | recommended | Deployment/build identifier |
| `LOG_LEVEL` | no | Structured-log threshold |
| `CORS_ALLOWED_ORIGINS` | yes | Exact comma-separated Averon Web and Emmy App origins |
| `SHUTDOWN_TIMEOUT_MS` | no | 1000–60000; default 10000 |
| `AI_DIAGNOSTICS_MAX_ENTRIES` | no | 1–500; default 100 |
| `AI_DIAGNOSTICS_RETENTION_DAYS` | no | 1–90; default 7 |

`AI_DIAGNOSTICS_MAX_RECORDS` remains a backwards-compatible alias, but new environments should use `AI_DIAGNOSTICS_MAX_ENTRIES`.

## Deployment checks

- Build each frontend with its final public API URL; changing runtime environment variables after a Vite build does not rewrite the bundle.
- Set API CORS origins to the exact deployed frontend origins.
- Route `/health` for liveness and `/ready` for readiness.
- Expose the API via HTTPS and preserve raw request bytes on the Stripe webhook route.
- Deliver SIGTERM with at least the configured shutdown grace period.
- Keep all API secrets in the hosting provider's secret manager.
- Do not deploy until Firebase rules/indexes, custom claims, test-mode payments, authentication, and rollback have been verified.
