# Firestore migration notes

No rules or indexes were deployed. The repository includes `firebase.json` and `firestore.indexes.json` so the audited configuration can be reviewed and deployed explicitly.

## Phase 8 tenancy collections

- `businesses/{businessId}`: server-managed canonical business identity and active/disabled status.
- `workspaces/{workspaceId}`: server-managed operational context linked by `businessId`.
- `workspaceMemberships/{workspaceId}__{userId}`: server-managed user/workspace/business role and status. Deterministic IDs prevent duplicate membership documents.

All three collections are intentionally server-only. No direct browser reads or writes are required: both frontends use authenticated averon-api workspace endpoints. Future Firestore rules should explicitly deny client access to these collections. Firebase Admin bypasses client rules and averon-api performs membership authorization on every workspace request.

Phase 8 queries require a composite index on `workspaceMemberships(userId ASC, status ASC)` for authorized listing. It is declared in `firestore.indexes.json` and must reach the ready state in the selected Firebase project before testing. Member administration queries `workspaceId` alone and uses its automatic single-field index. No `workspaceId + status` or `businessId + status` query is implemented.

## Phase 9 Business OS

- `businessOs/{workspaceId}` is the server-only root container.
- `businessOs/{workspaceId}/sections/{sectionId}` stores structured, classified, versioned context.
- `businessOs/{workspaceId}/decisions/{decisionId}` stores versioned durable decisions.

Direct client reads and writes should be denied; Emmy App uses averon-api. The API resolves membership and visibility on every read and requires workspace management permission for writes. Existing `firestore.rules` has no matching allow rule, so these collections are denied to clients by default; retain an explicit-deny recommendation when rules are reorganized. Section `orderBy(type)` and decision `orderBy(updatedAt desc)` use automatic single-field indexes. No composite Business OS index is needed.

## Client access retained

- `users/{uid}` create/read/update remains required by Firebase account profile initialization.
- Owner-scoped real-time reads remain for quotes, contracts, invoices, payments, messages, and notifications.
- Owner-scoped payment reads remain client-accessible while Stripe writes/reconciliation are API-only.

## Writes now routed through averon-api

- Quote creation and admin replies.
- Contract assignment/invoice creation and customer contract signing.
- Admin message read state and migrated audit records.
- Notification read state is available through the API.
- Checkout and webhook reconciliation writes `payments`, `invoices`, `notifications`, `auditLogs`, and idempotency records in `stripeEvents` through averon-api.

After production clients are confirmed on these endpoints, rules should be tightened to remove corresponding direct client writes. Do not tighten them before rollout compatibility is proven.

## Customer project workspace

The project workspace adds server-managed `projects`, `projectMilestones`, `projectFiles`, and `changeRequests` collections. Existing `messages`, `contracts`, `invoices`, `payments`, `notifications`, and `auditLogs` are reused. The browser uses authenticated averon-api endpoints; it does not need direct access to the new collections. Existing rules have no allow match for these collections, so client access remains denied by default. No rules were changed or deployed.

Implemented queries are `projects(contractId == ...)`, `projects(customerId == ...)`, and each project child collection by `projectId`; invoice/payment lookup is by `contractId`. These use automatic single-field indexes. No new composite index is required by the implemented query shapes.

## Queries and indexes

Admin queries use `orderBy(createdAt desc)` with a limit and need the automatic single-field `createdAt` index. Owner queries use `where(customerId == uid)` plus `orderBy(createdAt desc)` and require composite indexes for each retained collection: `quotes`, `contracts`, `invoices`, `payments`, `messages`, and `notifications` on `customerId ASC, createdAt DESC`. These are declared in `firestore.indexes.json`; existing deployed indexes were not available for inspection.
