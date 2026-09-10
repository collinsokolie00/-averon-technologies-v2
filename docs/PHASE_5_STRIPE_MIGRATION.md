# Phase 5 Stripe migration

## Old architecture

Root `vite.config.ts` created Checkout Sessions, retrieved their status, verified webhooks, and wrote Firestore records. The browser sent a contract ID and used `/api/stripe/*`. Redirect origins came from the request `Origin`, which was too permissive.

## New architecture

`averon-api` owns Stripe through a provider boundary:

```text
averon-web → typed API client → payment route → PaymentService
  → PaymentRepository (provider-neutral Firestore records)
  → StripePaymentProvider (Stripe SDK only)

Stripe → POST /api/v1/webhooks/stripe (raw body) → signature verification
  → provider-neutral event → transactional reconciliation
```

Checkout is `POST /api/v1/payments/checkout` with only `invoiceId`. The API verifies Firebase authentication, invoice ownership, unpaid state, amount, and currency. URLs use the server-owned `PAYMENT_FRONTEND_ORIGIN`; browser redirects are not accepted. `GET /api/v1/payments/status/:checkoutReference` is authenticated and owner-scoped.

## Idempotency and reconciliation

- An existing open, unpaid Checkout Session is reused.
- Stripe creation uses an invoice/attempt idempotency key.
- Checkout audit documents use deterministic IDs.
- Verified event IDs are transactionally stored in `stripeEvents`; an existing ID returns `duplicate` before payment, invoice, notification, or audit writes.
- Invoice customer, contract, amount, and currency must match the verified event.
- Paid events update payment and invoice status/`paidAt` and create one existing-domain notification.
- Failed and expired events update the payment only. Contract status is not guessed or changed.

Handled events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`. Other verified events are acknowledged as ignored.

## Provider-neutral mapping and schema additions

Existing `payments` and `invoices` collections remain. New writes may add `provider: stripe`, `providerReference`, `checkoutReference`, `paidAt`, and `updatedAt`; legacy `stripeSessionId` remains for compatibility. `stripeEvents/{eventId}` stores only processing time, normalized type, and checkout reference. Historical records are not backfilled automatically.

Audit actions are `PAYMENT_CHECKOUT_CREATED`, `PAYMENT_SUCCEEDED`, `PAYMENT_FAILED`, and `PAYMENT_CHECKOUT_EXPIRED`. Full Stripe payloads are never stored or logged.

## Environment and production configuration

Only averon-api owns `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `PAYMENT_FRONTEND_ORIGIN`. Production still requires secrets, exact HTTPS frontend origin, an externally reachable API, and Stripe webhook registration for `/api/v1/webhooks/stripe`. None were configured or called during this phase.

For future test-mode integration testing, inject a Stripe test key into averon-api, run the API, and use Stripe CLI forwarding to the webhook endpoint. This requires explicit authorization and was not executed.

## Legacy Vite status and limitations

The legacy Vite Stripe plugin is no longer registered, has no Stripe import, and exposes no active endpoint. Its inert commented body remains temporarily in `vite.config.ts` as migration-review context because the repository has a large uncommitted architectural diff; it should be deleted mechanically after this migration is reviewed/committed. Stripe status now reflects webhook-backed Firestore state rather than querying Stripe on every success-page poll.

Automated tests use injected provider/repository implementations and never call Stripe. See `apps/averon-api/test/payments.test.ts`.
