# Final integration test plan

This plan tests the completed Phase 13 system. Use a dedicated Firebase test project or explicitly identified test accounts and records. Do not create fabricated production data, use live Stripe mode, or deploy from this checklist without separate approval.

## A. Local infrastructure

1. Install Node.js 22+ and run `npm install`.
2. Configure the three environment files from `FINAL_ENVIRONMENT_CHECKLIST.md`.
3. Confirm ports 5173, 5174, and 8787 are free: `lsof -nP -iTCP:5173 -iTCP:5174 -iTCP:8787 -sTCP:LISTEN`.
4. Run `npm run dev:all`. Strict ports prevent silent CORS-breaking reassignment.
5. Verify `http://localhost:5173`, `http://localhost:5174`, `GET http://localhost:8787/health`, `GET /ready`, and `GET /api/v1/version`.
6. Expect `/ready` to be `ready` when Firebase, Stripe, and DeepSeek are configured; `degraded` is acceptable only when deliberately testing without optional Stripe/DeepSeek. `not_ready` means Firebase core setup is incomplete.
7. In browser developer tools, confirm both frontends call the configured API origin and no CORS or mixed-content error occurs.

## B. Authentication

- Register/sign in to Averon Web using an intended Firebase method; sign out and sign in again.
- Sign in to Emmy App with the same Firebase project.
- Call `GET /api/v1/session` with a current Firebase ID token and verify only safe identity fields are returned.
- Verify an owner/admin token can call `GET /api/v1/admin/session` and an ordinary user receives 403.
- Verify missing, malformed, expired, and wrong-project tokens receive typed 401 responses.
- Confirm the owner/admin custom claim was applied by a trusted Admin SDK operator, then force token refresh or sign out/in. Never accept a role from client input or Firestore profile data.

## C. Workspaces

With `API=http://localhost:8787` and a refreshed owner `TOKEN` in the shell only:

```sh
curl -H "Authorization: Bearer $TOKEN" -X POST "$API/api/v1/admin/workspaces/bootstrap" -H 'Content-Type: application/json' -d '{}'
curl -H "Authorization: Bearer $TOKEN" "$API/api/v1/workspaces"
```

- Run bootstrap twice and verify the second call creates nothing/does not overwrite records.
- Verify Averon, Movento, and Lumora appear for the bootstrapping owner and can be selected in Emmy App.
- Use a separate member with access to only one workspace; verify other workspace detail URLs return 403.
- Disable that membership and verify listing/detail/private Emmy access is removed immediately.

## D. Business OS

For each of `averon`, `movento`, and `lumora`, initialize explicitly:

```sh
curl -H "Authorization: Bearer $TOKEN" -X POST "$API/api/v1/workspaces/averon/business-os" -H 'Content-Type: application/json' -d '{}'
```

Create a clearly labeled test section in the test project, read it, update it, then archive or retain it according to the test-data policy:

```sh
curl -H "Authorization: Bearer $TOKEN" -X POST "$API/api/v1/workspaces/averon/business-os/sections" -H 'Content-Type: application/json' -d '{"id":"e2e-readiness","type":"instructions","title":"E2E readiness record","content":{"summary":"Controlled integration-test record.","fields":{"instruction":"Use only during the approved test."}},"visibility":"internal","status":"active"}'
curl -H "Authorization: Bearer $TOKEN" "$API/api/v1/workspaces/averon/business-os/sections/e2e-readiness"
curl -H "Authorization: Bearer $TOKEN" -X PATCH "$API/api/v1/workspaces/averon/business-os/sections/e2e-readiness" -H 'Content-Type: application/json' -d '{"title":"E2E readiness record updated"}'
```

- Confirm version increments from 1 to 2 and corresponding audit actions exist without body content.
- Viewer: public only. Member: public/internal. Workspace admin/owner: public/internal/restricted.
- Direct reads of inaccessible restricted items must return 404; cross-workspace access must return 403.

## E. Public Emmy

- Send one bounded public question through Averon Web and verify a DeepSeek response.
- Ask about a fact in the public Emmy knowledge prompt and verify the answer is public-only.
- Ask for a private Business OS-only marker and confirm it is unavailable/not exposed.
- Confirm the request is rate-limited and no prompt/reply is logged.

## F. Private Emmy

- Log in to Emmy App, select each authorized workspace, and verify chat state resets on workspace change.
- Ask a direct Business OS question; verify an authorized claim-level citation and correct version.
- Send SEO, blog, SEO+blog, and analytics-without-data requests. Analytics must return `needs_input` without invented metrics.
- Confirm business claims without an authorized source are removed or replaced with the safe unsupported-claim response.
- Place a unique marker only in one workspace and confirm it never appears in another workspace's response.
- Confirm Emmy does not claim to publish, mutate records, send email, browse, or execute actions.

## G. Specialist orchestration

- Direct fact question: no worker.
- SEO request: SEO worker only.
- Blog request: Blog worker.
- Combined request: SEO completes before dependent Blog.
- Current/external research: limitation reported; no browsing claim.
- Analytics without supplied metrics: `needs_input`.
- Documentation request: Documentation worker.
- Attempted `coding`, arbitrary agent ID, or frontend worker injection: no disabled worker execution.
- Confirm the five-call ceiling, schema validation, and one repair maximum using existing automated tests.

## H. Diagnostics

- Owner/admin can open `/diagnostics` and both diagnostics API routes.
- Ordinary users and unauthenticated callers receive 403/401.
- Verify request/workspace IDs, timings, status, worker IDs, validation state, calls, tokens, citations, grounded/unsupported claim counts, and attribution status.
- Search the returned JSON for test prompt text, reply text, unique Business OS markers, credentials, and authorization headers; all must be absent.

## I. Stripe test mode

1. Configure only `sk_test_…` and a test webhook signing secret.
2. Locally run `stripe listen --forward-to http://localhost:8787/api/v1/webhooks/stripe`, then place its `whsec_…` in the API environment and restart.
3. Through the existing admin contract-assignment UI/API, create a contract and unpaid deposit invoice for a dedicated Firebase test customer.
4. As that customer call `POST /api/v1/payments/checkout` with `{"invoiceId":"…"}` and follow the returned Stripe URL.
5. Use Stripe's test card `4242 4242 4242 4242`, any future expiry, and any CVC/postcode.
6. Verify the signed webhook reaches the API, invoice and payment become paid, and exactly one notification and payment audit record are created.
7. Resend the same Stripe event and verify it is acknowledged as duplicate without repeated notification/audit effects.
8. Also test canceled/expired checkout and an amount mismatch in the dedicated test environment.

## J. Security

- Scan production frontend assets for Firebase Admin/service-account fields, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DEEPSEEK_API_KEY`, bearer tokens, and private API endpoint credentials.
- Confirm frontend dependency graphs do not include `firebase-admin`, Stripe server SDK use, or server provider adapters.
- Send an OPTIONS/request with an unknown `Origin`; expect typed 403 and no access-control allow-origin header.
- Repeat cross-workspace, restricted-section, arbitrary-agent, and invented-citation attacks.
- Confirm server responses/logs do not expose raw errors, configuration values, prompts, replies, or Business OS bodies.

## K. Production build

Run from the repository root:

```sh
npm run typecheck
npm run lint
npm test
npm run eval
npm run eval:golden
npm run build
npm ls --all --omit=optional
git diff --check
```

Record exact counts, bundle warnings, runtime versions, tested commit, Firebase project, Stripe test account, API build ID, and who approved the test. Do not treat offline tests as proof that external credentials or deployed routing work.

## Firebase production prerequisites

1. Create/select the intended Firebase project and register both web apps.
2. Enable intended Auth providers and authorized domains.
3. Provision the first platform owner through a trusted Admin SDK operation. Example operator snippet (run only with explicit authorization and ADC configured): `node --input-type=module -e 'import {initializeApp,applicationDefault} from "firebase-admin/app"; import {getAuth} from "firebase-admin/auth"; initializeApp({credential:applicationDefault(),projectId:process.env.FIREBASE_PROJECT_ID}); await getAuth().setCustomUserClaims(process.argv[1],{role:"owner"})' "$OWNER_UID"`.
4. Refresh the owner's ID token, verify `/api/v1/admin/session`, then invoke the idempotent workspace bootstrap.
5. Initialize each Business OS explicitly; do not seed invented facts.
6. Review `firestore.rules` and `firestore.indexes.json` against the selected project. With separate deployment approval: `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project "$FIREBASE_PROJECT_ID"`.
7. Verify the `workspaceMemberships(userId ASC, status ASC)` index is built before workspace listing tests. The retained customer collection indexes are also declared.

## Controlled DeepSeek test

Set the server-only key and defaults in the API runtime, restart, verify `/ready` reports Emmy enabled, send one short public question, then one private direct question. Inspect success/error category and token metadata, not prompt content. Stop on authentication, quota, rate-limit, unexpected-cost, or malformed grounded-output errors before worker tests.
