# Private Emmy conversations

Private Emmy history is stored by `averon-api`, never in browser storage. `emmyConversations` documents are owned by the authenticated Firebase UID and optionally bind to one canonical workspace. Messages live in each conversation's `messages` subcollection.

All conversation endpoints require authentication. The service checks document ownership and re-resolves `emmy:use` membership for workspace-bound conversations when they are created, listed, loaded, or used. Revoked workspace conversations are hidden and cannot be reopened. General-mode conversations use `workspaceId: null` and never receive Business OS context.

Endpoints:

- `GET|POST /api/v1/emmy/conversations`
- `GET|POST /api/v1/emmy/conversations/:conversationId/messages`

The send endpoint loads bounded server history, persists the user message, routes through the existing general or private Emmy service, and persists the assistant reply and safe citations. Workspace conversations therefore retain the existing workspace authorization, Business OS grounding, planner, specialist selection, validation, and diagnostics path. Public `/api/v1/emmy/messages` remains stateless and cannot access these collections.

The initial title is derived deterministically from the first user message, avoiding a second provider call.
