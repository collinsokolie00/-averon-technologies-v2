# Phase 8 workspace tenancy

## Concepts and data model

The pre-existing customer “workspace access” flag describes a contract-gated project portal and is not multi-business tenancy. Dormant shared workspace identities and agent context contracts had no persistence or authorization implementation. Phase 8 leaves the customer portal intact and establishes three server-owned collections:

- `businesses/{businessId}`: real company/product identity with `id`, `name`, `slug`, `status`, and timestamps.
- `workspaces/{workspaceId}`: operational application/AI context linked to one business, with the same minimal identity/status metadata. One primary workspace per business is used now, while IDs remain independent for future expansion.
- `workspaceMemberships/{workspaceId}__{userId}`: deterministic link containing user, workspace, business, workspace role, status, and timestamps.

The only canonical definitions are `averon` / Averon Technologies, `movento` / Movento, and `lumora` / Lumora. No production write occurs at startup.

## Roles and permissions

Firebase custom claims remain platform roles: `owner`, `admin`, or ordinary `user`. Workspace membership independently uses `owner`, `admin`, `member`, or `viewer`. Platform owner is allowed to run the controlled initial bootstrap; platform admin does not automatically gain tenancy access.

Workspace permissions are derived in backend code rather than stored in Firestore: workspace/business read and management, current customer/quote/contract/payment read/manage capabilities, content read/manage, and `emmy:use`. No agent, integration, Altrex, or Business OS permissions were introduced. Viewer is read-only and cannot use private Emmy; member gains current operational reads and Emmy use; admin/owner gain management, while only workspace owner may grant the owner role.

## Bootstrap and membership administration

An authenticated platform owner explicitly invokes `POST /api/v1/admin/workspaces/bootstrap`. It creates missing canonical business/workspace documents and missing owner memberships for that caller. Existing documents and memberships are never overwritten, arbitrary users receive nothing, and repeat calls are safe. It is deliberately not an automatic seed or general authorization shortcut.

Minimal membership APIs are:

- `GET /api/v1/admin/workspaces/:workspaceId/members`
- `POST /api/v1/admin/workspaces/:workspaceId/members`
- `PATCH /api/v1/admin/workspaces/:workspaceId/members/:membershipId`

They require `workspace:manage`. Admin cannot grant owner; ordinary members cannot self-grant. Duplicate deterministic memberships are rejected. Deactivation immediately removes private access. The repository prevents disabling the final active owner. No membership UI was added.

## Workspace resolution and APIs

`WorkspaceAuthorizationService` composes existing Firebase authentication with repository membership resolution. Active membership, active workspace, active business, matching user ID, and requested workspace ID are checked server-side. It produces a safe context with workspace/business identities, current user, membership ID, role, and derived permissions.

- `GET /api/v1/workspaces` lists only the caller's active authorized workspaces.
- `GET /api/v1/workspaces/:workspaceId` returns only safe context for an active membership.

The frontend-selected ID is never trusted. No global current-workspace server state exists and no other user's membership is returned by user endpoints.

## Frontend behavior

The shared API client exposes `workspaces.list()` and `workspaces.get(id)`. Emmy App loads real memberships with loading, empty, and error states; selecting a workspace stores only its ID in session storage. The chat shell displays the selected name and explicitly states that workspace-specific Emmy orchestration is not connected. Public website Emmy remains public and unchanged. Averon Web receives reusable types/client methods but no admin redesign or forced tenancy rewrite.

## Isolation, Firestore, and audit compatibility

Tests prove unauthenticated denial, cross-workspace denial, inactive membership denial, disabled workspace denial, role mapping, and management privilege boundaries. Tenancy collections are server-only; see `FIRESTORE_MIGRATION_NOTES.md`. The implemented listing query requires `workspaceMemberships(userId ASC, status ASC)`. Membership audit entries add optional `workspaceId` and `businessId`; legacy audit records remain valid without them.

## Deliberately deferred

No Business OS fields/content, private Emmy routing, agents, external Movento/Lumora application connections, Ryan Jewelry, Altrex, email automation, or direct client Firestore membership access was added. Next-phase Business OS data can attach below an authorized workspace ID and must call the same resolver on every request.
