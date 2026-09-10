import type { AuthContext } from "../../services/auth/authentication.ts";
import type { ConversationService } from "./conversation.service.ts";

export async function handleConversationRoute(input: { method: string; path: string; body: unknown; auth: AuthContext; service: ConversationService; requestId: string }) {
  const workspaceMatch = /^\/api\/v1\/workspaces\/([^/]+)\/emmy\/conversations$/.exec(input.path);
  if (workspaceMatch && input.method === "GET") return { status: 200, data: await input.service.listWorkspace(input.auth, decodeURIComponent(workspaceMatch[1])) };
  if (input.path === "/api/v1/emmy/conversations") {
    if (input.method === "GET") return { status: 200, data: await input.service.list(input.auth) };
    if (input.method === "POST") return { status: 201, data: await input.service.create(input.auth, input.body) };
  }
  if (input.path === "/api/v1/emmy/conversations/general" && input.method === "GET") return { status: 200, data: await input.service.listGeneral(input.auth) };
  const conversationMatch = /^\/api\/v1\/emmy\/conversations\/([^/]+)$/.exec(input.path);
  if (conversationMatch && input.method === "DELETE") return { status: 200, data: await input.service.delete(input.auth, decodeURIComponent(conversationMatch[1])) };
  const match = /^\/api\/v1\/emmy\/conversations\/([^/]+)\/messages$/.exec(input.path);
  if (!match) return null; const id = decodeURIComponent(match[1]);
  if (input.method === "GET") return { status: 200, data: await input.service.messages(input.auth, id) };
  if (input.method === "POST") return { status: 200, data: await input.service.send(input.auth, id, input.body, input.requestId) };
  return null;
}
