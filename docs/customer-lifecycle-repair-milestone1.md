# Customer lifecycle repair — Milestone 1

This milestone extends the existing customer/business/project APIs. Guardian,
Emmy orchestration, specialist permissions, integrations and deployments are unchanged.

## Activation and signing

`ProjectService.activateContract` is the canonical activation path called after
API signing and after paid-event reconciliation, including webhook replay.
The repository transaction reads the contract and deposit invoice, verifies
matching customer/contract, signed status/identity, paid deposit amount/currency,
and existing `workspaceAccess` authorization. It writes the project and
`contract.projectId` atomically. That contract write serializes concurrent attempts;
the legacy project-by-contract check preserves compatibility with existing projects.
Signing and payment may occur in either order. A failed activation callback can be
retried by replaying the paid event or repeating the same signing request.

Only assigned, owned contracts with stored scope/version/title are signable.
An identical signed request is idempotent; changing a recorded signature or signing
a cancelled/other state is rejected. The customer screen displays actual stored
scope, version and deposit, and records typed-name acceptance, not qualified signing.
Firestore contract updates and customer quote/message creation now use the API as
their canonical boundary. No existing records are migrated or deleted.

## Payments, access and email

Checkout completion and asynchronous success only become paid when the verified
session's `payment_status` is `paid`. Unpaid/unknown completion is ignored until
settlement. Reconciliation still checks amount, currency and ownership, and a late
failure cannot downgrade an already paid checkout.

Every protected project workspace, download and customer mutation checks enabled,
unlocked, owned access. Account message projection and direct Firestore message
reads also enforce project access. Revocation does not erase unlock history.
Already issued signed storage URLs remain usable until their existing five-minute
expiry; this is not an immediate storage-token revocation mechanism.

Project creation records access email as pending, then sent/failed. Missing Resend
configuration persists failure, not success. Admin project listing exposes delivery
status. `POST /api/v1/projects/:id/access/regenerate` remains admin-only, rotates the
password, and now returns `deliveryStatus: sent | failed`. No secret/password is
returned by that endpoint. A pending delivery after process interruption, or failed
delivery, requires authorized regeneration. Mailbox receipt is a later E2E check.

## Bounded lifecycle operations

All routes require authentication. Operator routes require existing global Averon
admin/owner claims. Customer records remain scoped to the token UID; these domains
do not implement tenant workspace memberships. Workspace members and specialists
receive no operator authority. Record associations come from storage, never from
customer-supplied ownership fields.

| Operation | Route and body | Boundary |
| --- | --- | --- |
| Issue commercial offer | `PATCH /api/v1/quotes/:id` — `status: approved`, `adminReply`, `amountCents`, `currency: eur or usd` | Admin; account-linked quote; increments revision |
| Decide offer | `PATCH /api/v1/quotes/:id/decision` — `decision: accepted or rejected`, displayed `revision` | Owning customer; only issued/priced offer; stale revision rejected |
| Read operator lifecycle | `GET /api/v1/admin/projects/:id/lifecycle` | Admin; associated milestones and change requests |
| Update milestone | `PATCH /api/v1/projects/:id/milestones/:milestoneId` — `status`, integer `progressPercent` | Admin; milestone must belong to project; completed means 100%, pending means 0% |
| Reply to message | `POST /api/v1/messages/:id/reply` — `body` | Admin; derives customer/project from original customer message; checks association |
| Decide change | `PATCH /api/v1/projects/:id/change-requests/:changeId` — `status: approved, declined, or completed` | Admin; matching project/customer; no automatic project mutation |

Quote decisions are final and visible in the existing admin list. Acceptance does
not invent a contract: assignment remains an explicit admin action. Guest inquiries
are not automatically linked by email; they cannot receive a portal commercial offer.
Use an authenticated internal customer for the controlled lifecycle test.

Change transitions preserve existing vocabulary: submitted/reviewing → approved or
declined (rejection); approved/in_progress → completed. Same-state retries are
idempotent. Decisions record actor/time and audit events. Milestone completion is
timestamped; reopening clears its current completion timestamp while retaining audit.
Project-level progress remains separately admin-managed, not silently recomputed.
Admin message replies retain association, timestamps and unread status. The original
customer message becomes read. Customer completion dissatisfaction produces follow-up
without setting `acceptedAt`; satisfaction records acceptance separately from completion.

## Verification and controlled E2E prerequisites

Run API lifecycle tests with:

```sh
node --experimental-strip-types --test apps/averon-api/test/customer-lifecycle-milestone1.test.ts apps/averon-api/test/business.test.ts apps/averon-api/test/payments.test.ts apps/averon-api/test/projects.test.ts apps/averon-api/test/project-files.test.ts
npx vitest run --config vitest.customer-lifecycle.config.ts
```

The API regressions execute production repository methods against isolated in-memory
transactions, plus authenticated HTTP routes and locally signed Stripe fixture events.
They do not write cloud data. Firestore policy regression is a static source assertion,
not an emulator integration test. This machine has no Java runtime; emulator/deployed
rules verification remains a prerequisite before a live controlled E2E run.

Milestone updates/change decisions are intentionally API-first, with an operator
lifecycle read path and API-client methods; no project-management UI redesign was added.
The account/manager UI supports offer issuance/decisions, actual contract scope, and
admin message replies. Customer uploads, balance billing, multi-member access,
Emmy project grounding and broad email automation remain out of scope.

Before any live test, separately authorize an isolated Firebase environment, Stripe
test mode/webhook, private test storage and a controlled Resend recipient. Deploy and
verify the new API/rules together only after approval. No live E2E, deployment, commit,
push, or production test-data mutation is part of this milestone.

## Completion verification

- Focused customer/business/payment/project/contract/quote tests: **62/62**,
  including **18** new API regressions.
- Mounted customer UI tests: **5/5**.
- Guardian regressions: **87/87**.
- Authentication/workspace/Emmy/specialist smoke regression group: **116/116**.
- Orchestration evaluation: **10/10**.
- Full API suite: **459/459**.
- API typecheck, repository production build (Averon, Emmy app, API), repository
  lint and `git diff --check`: pass. Frontend build retains a chunk-size warning.
- No existing assertions were weakened. No Guardian, specialist or Emmy
  implementation files changed. No cloud services were exercised.
- A further focused regression demonstrated that optional milestone target dates
  were being written as `undefined`; creation now omits the absent field.

Code is ready for the bounded API-assisted internal lifecycle test, conditional on
the environment/rules/email prerequisites above. It is not an authorization to
begin the live test. The scoped worktree can be checkpointed after review/approval;
no files are staged and no commit or push has been made.

### Exact changed-file manifest

```text
apps/averon-api/src/app.ts
apps/averon-api/src/domains/business/business.repository.ts
apps/averon-api/src/domains/business/business.routes.ts
apps/averon-api/src/domains/business/business.schemas.ts
apps/averon-api/src/domains/business/business.types.ts
apps/averon-api/src/domains/payments/payment.repository.ts
apps/averon-api/src/domains/payments/payment.service.ts
apps/averon-api/src/domains/projects/project.repository.ts
apps/averon-api/src/domains/projects/project.routes.ts
apps/averon-api/src/domains/projects/project.service.ts
apps/averon-api/src/domains/projects/project.types.ts
apps/averon-api/src/providers/payments/stripe/stripe.adapter.ts
apps/averon-api/test/customer-lifecycle-milestone1.test.ts
firestore.rules
packages/api-client/src/index.ts
src/pages/account/CustomerAccountPages.tsx
src/pages/admin/ManagerPage.tsx
test/customer-lifecycle.test.tsx
vitest.customer-lifecycle.config.ts
docs/customer-lifecycle-repair-milestone1.md
```
