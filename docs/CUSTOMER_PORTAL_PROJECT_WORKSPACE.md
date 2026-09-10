# Customer Portal project workspace

## Architecture and data

The existing `/client-portal`, Firebase customer session, averon-api token provider, signed contracts, invoices, Stripe webhook reconciliation, notifications, messages, and audit logs remain authoritative. The portal now calls averon-api instead of rendering its previous static project dataset.

`projects/{projectId}` stores customer and contract ownership, project reference, title/summary, status, explicit admin-managed `progressPercent`, optional schedule/completion/acceptance/maintenance dates, access state, a versioned password hash, and delivery state. `projectMilestones`, `projectFiles`, and `changeRequests` are keyed by `projectId`. Existing contract, invoice, payment, message, notification, and audit collections are reused. No mock production records or automatic workspace memberships are created.

## Payment activation and email

Project activation is a callback from the existing verified Stripe reconciliation service. It runs only after the repository has accepted a non-duplicate paid event; existing signature, invoice/customer/contract, amount, currency, and event-id checks remain unchanged. The project repository then independently requires the matching signed contract. A contract gets at most one project, which prevents a later paid event from generating another credential.

The API generates a 12-character mixed-case/alphanumeric password from an ambiguity-reduced alphabet. It hashes it with Node scrypt using a random 16-byte salt and stores only `scrypt$salt$derived-key`. The plaintext exists only for the Resend request and is never logged or returned by an API. `RESEND_API_KEY` and `PROJECT_ACCESS_EMAIL_FROM` are server-only. Email failure records `failed` while leaving payment and access valid. An admin can regenerate and email a new credential; this replaces the hash and invalidates the old password.

## Customer authorization and portal flow

Firebase authentication remains the first gate. All project identifiers are checked against the token UID; customer IDs are never accepted from request bodies. The password verification route additionally checks ownership, access enabled state, and the scrypt hash. Attempts are limited to five per user/project in five minutes per API process. A successful verification records the project unlock. The credential hash and customer email are removed from workspace responses.

The project list supports multiple customer-owned projects. Each project has its own credential and data. The selected project shows real status, explicit admin-managed progress, milestones, contract, invoices/payments, file metadata, internal messages, and change requests. Missing milestones/files/messages are rendered as empty states. Files expose metadata only; storage paths are stripped and downloads remain deferred until an authorized download service exists.

## Completion, feedback, and maintenance

Only an existing admin/owner route can change project status or progress and add milestones. Marking a project completed for the first time stores `completedAt`, `maintenanceStartAt`, and an end date one calendar month later. The included policy is minor bug fixes, small text/content edits, small image replacements, minor layout corrections, and delivered-functionality support. New pages, major redesign/features, new integrations, and complete scope changes are excluded.

After completion, a customer can submit one satisfaction result. A satisfied result is retained for a future testimonial flow but is never published. A not-satisfied result creates a structured `completion_feedback` change request and customer notification. The repository transaction prevents a second feedback record.

## Admin controls and audit

Existing platform admin/owner authorization protects project updates, milestone creation, completion, and credential regeneration. The backend records credential generation, email success/failure, and unlock actions. Project access activation also creates the existing customer notification. Broader admin screens, file upload/download, milestone editing UI, email resend without credential rotation, attachment support, and automated maintenance-expiry notifications remain intentionally deferred.

## Firestore and security

New project-management writes are server-only through Firebase Admin. Existing Firestore rules were not changed or deployed. Current query shapes need only automatic single-field indexes; see `FIRESTORE_MIGRATION_NOTES.md`. Frontend bundles receive only public Firebase client configuration and never receive Resend, Stripe, Firebase Admin, password hashes, or service-account values.

## Testing

Deterministic tests cover salted hashing, correct/wrong password verification, successful and duplicate activation, email capture, multiple-project owner filtering, wrong-customer denial, rate limiting, internal messaging, change requests, and one-time completion feedback. Existing API/auth/payment/workspace/swarm tests remain in the normal test suite. Live Stripe, Firebase, and Resend are not invoked.

## Remaining limitations

- Access-password rate limits and unlock markers use the current process/Firestore model; a distributed limiter and per-device unlock sessions would be a future hardening phase.
- Project creation assumes the approved order: contract signed before payment confirmation. There is no retroactive activation job for an out-of-order legacy payment.
- File upload and authorized download URLs are not implemented; the portal shows an honest empty state or server-returned metadata.
- The existing account profile/settings persistence was left unchanged because it is outside the project workspace and requires a separate approved field/authorization design.
- Admin inspection continues through backend records and existing tooling; a full project-admin UI was not added.
