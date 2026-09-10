# Phase 10 Private Emmy

Phase 10 connects the authenticated Emmy App to a workspace-scoped, read-only assistant. The new endpoint is `POST /api/v1/workspaces/:workspaceId/emmy/messages`; the existing public `POST /api/v1/emmy/messages` contract and public prompt remain separate.

## Authorization and request boundary

The API authenticates the Firebase token, resolves an active business, workspace, and membership, and requires the existing `emmy:use` permission. Workspace identity, role, permissions, and business identity come only from the server. The strict request body accepts `message` and optional bounded `history`; attempts to submit identity or authorization fields are rejected. Existing policy allows owner, admin, and member roles to use private Emmy. Viewer remains read-only without `emmy:use` and is denied before Business OS retrieval or model invocation.

## Context retrieval and prompt safety

The backend deterministically maps message keywords to at most six Business OS section types, always beginning with profile, brand, and controlled instructions. It calls `BusinessOsService.getBusinessContext` with a maximum of 12 active records. That service enforces role visibility: members receive public and internal context, while owners/admins may additionally receive restricted context.

Private Emmy has a dedicated prompt. Security and read-only constraints precede all retrieved data. Workspace instructions are isolated from reference facts and remain subordinate to system rules. Emmy must not invent missing business facts and cannot call tools, agents, email, Altrex, integrations, external systems, or mutate records. Uninitialized and initialized-but-empty Business OS states are explicit in the prompt and response.

The selected section IDs exist only inside server-side prompt assembly. The HTTP response contains the reply, safe workspace name/ID, and `businessOsStatus`; no hidden context, permission list, or provider payload is returned.

## Isolation, rate limiting, and observability

Private rate limiting is separate from public Emmy and keyed by authenticated user plus workspace. AI operation logs contain request ID, model, duration, outcome, usage, channel, authentication state, and safe workspace/business IDs. Prompts, messages, retrieved section content, credentials, and tokens are never logged.

Emmy App stores a bounded 20-message transcript in session storage under `averon:emmy-history:<workspaceId>`. The chat remounts on workspace selection, so histories cannot bleed between workspaces. The UI provides no-workspace, empty transcript, sending, failure, access-change, rate-limit, and missing-context states. It performs no direct Firestore read and contains no provider credentials.

## Deliberate exclusions

This phase does not activate agent contracts, specialist agents, tools, natural-language mutations, persistent server memory, email, Altrex, or any external application integration. It does not deploy, modify Firebase rules, or seed production Business OS data.
