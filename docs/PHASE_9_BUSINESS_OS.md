# Phase 9 Business OS

## Purpose and existing knowledge

Business OS is authoritative, structured, workspace-scoped business context for private application use. Preflight found real Averon public knowledge in `src/pages/Services.tsx`, `src/components/sections/ServicesSection.tsx`, `src/data/productContent.ts`, and the backend-owned public Emmy knowledge in `apps/averon-api/src/ai/emmy/emmy.prompt.ts`. Public services are duplicated across presentation modules and are not yet a single canonical catalog. No legitimate internal pricing, mission, vision, SOP, policy, strategy, or Movento/Lumora repository data exists in this repository.

No website content was copied into Firestore automatically. The Phase 6 public Emmy prompt remains unchanged and cannot read Business OS. This avoids an immediately stale second public source of truth. A future reviewed content migration can designate Business OS public sections as canonical, then update website/public Emmy readers together.

## Firestore model

```text
businessOs/{workspaceId}
  workspaceId, businessId, status, schemaVersion, timestamps, updatedBy
  sections/{sectionId}
    type, title, structured content, visibility, status, version, timestamps, updatedBy
  decisions/{decisionId}
    title, summary, supplied rationale, status, effectiveDate,
    supersedes/supersededBy, version, timestamps, createdBy, updatedBy
```

The root uses the workspace ID so one workspace has at most one container. Section content is a bounded object containing an optional concise summary and typed JSON-safe fields. Nested depth, field count, arrays, strings, titles, IDs, and unknown request fields are validated. Browser input cannot select `businessId`, `workspaceId`, timestamps, version, or actor metadata.

Supported section types are `profile`, `brand`, `services`, `pricing`, `policies`, `marketing`, `sales`, `seo`, `operations`, `sop`, `decisions`, `roadmap`, and `instructions`. No products or agent/integration configuration was added because no current requirement justifies it.

## Visibility and authorization

Every section is `public`, `internal`, or `restricted` and `active` or `archived`.

- Viewer: active public sections only.
- Member: active public and internal sections.
- Workspace admin/owner: active public, internal, and restricted sections; may initialize and mutate Business OS.

All operations first resolve the Phase 8 active membership, workspace, and business. `business-os:read`, `business-os:manage`, and `business-os:restricted-read` are derived from workspace roles, never stored as client-controlled arrays. These APIs are authenticated/private even for public-classified sections; “public” marks future safe reuse and does not create a public endpoint.

## Versioning, decisions, and audit

Sections and decisions start at version 1 and increment transactionally on each update. Critical records are not deleted; sections/decisions can be archived and decisions can record supersession. Decision rationale is limited to supplied, business-suitable text—never hidden model reasoning. Mutations emit `BUSINESS_OS_SECTION_CREATED`, `BUSINESS_OS_SECTION_UPDATED`, `BUSINESS_DECISION_CREATED`, or `BUSINESS_DECISION_UPDATED` audit records containing IDs, workspace/business, actor, type/version, and timestamp but never section bodies.

## API and initialization

- `GET|POST /api/v1/workspaces/:workspaceId/business-os` — metadata or idempotent initialization.
- `GET|POST /api/v1/workspaces/:workspaceId/business-os/sections`
- `GET|PATCH /api/v1/workspaces/:workspaceId/business-os/sections/:sectionId`
- `GET|POST /api/v1/workspaces/:workspaceId/business-os/decisions`
- `PATCH /api/v1/workspaces/:workspaceId/business-os/decisions/:decisionId`

Initialization requires workspace admin/owner membership, creates only an empty schema-v1 container, does not run at startup, and is safe to repeat. Averon, Movento, and Lumora are eligible through their real workspace authorization. Movento and Lumora remain empty until explicitly initialized; no facts or external data were invented.

## Retrieval and context selection

`BusinessOsService.getBusinessContext` is the internal future-Emmy interface. Callers request selected section types and a bounded record count (maximum 25). Repository ordering is deterministic by section type, archived and unauthorized visibility are filtered, and the complete Business OS is never blindly concatenated. There are no embeddings, semantic search, automatic summaries, or model calls.

## Emmy App and Averon Web

Emmy App links each authorized workspace to `/workspaces/:workspaceId/business-os`, clears old section state during workspace changes, and provides loading, unavailable, uninitialized, empty, and structured section-list states. It displays visibility, status, version, summary, and fields safely. Mutation methods exist in the typed client; no large CMS or autonomous chat editor was added. Averon Web/admin was not redesigned and only receives the shared client/contracts.

## Firestore access and indexes

Business OS collections are server-only. No Firebase rules were changed or deployed. Section listing uses the subcollection `type` ordering index, and decision listing uses `updatedAt DESC`; both are automatic single-field indexes. No composite Business OS index is required by implemented queries.

## Deferred

No Business OS production container was written, no external Movento/Lumora repository was touched, and no Ryan Jewelry data exists. Private Emmy orchestration, specialist agents, Altrex, email, natural-language mutations, public Business OS retrieval, vector search, service-catalog convergence, and a richer editor remain future work. Phase 10 can use the bounded retrieval interface after authenticating and resolving workspace context.

## Reviewed Averon public-knowledge migration

The owner-approved migration `npm run migrate:averon-business-os --workspace @averon/api` imports only facts already published in the current Averon repository: the public company profile, service catalog and delivery process, and product portfolio/status labels. It resolves the single active Averon workspace owner at runtime, passes every write through the canonical workspace authorization and Business OS services, is idempotent by stable section IDs, and does not touch Movento or Lumora. It deliberately excludes pricing, competitors, internal strategy, mission, policies, SOPs, and performance claims because no authoritative repository source exists for them.
