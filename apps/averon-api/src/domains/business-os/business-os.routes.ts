import type { AuthContext } from "../../services/auth/authentication.ts";
import type { BusinessOsService } from "./business-os.service.ts";

export async function handleBusinessOsRoute(input: { method: string; path: string; body: unknown; auth: AuthContext; service: BusinessOsService }) {
  const match = /^\/api\/v1\/workspaces\/([^/]+)\/business-os(?:\/(sections|decisions|history)(?:\/([^/]+))?)?$/.exec(input.path); if (!match) return null;
  const workspaceId = decodeURIComponent(match[1]); const collection = match[2]; const itemId = match[3] ? decodeURIComponent(match[3]) : undefined;
  if (input.method === "GET" && !collection) return { status: 200, data: await input.service.metadata(input.auth, workspaceId) };
  if (input.method === "POST" && !collection) return { status: 200, data: await input.service.initialize(input.auth, workspaceId) };
  if (collection === "sections" && input.method === "GET" && !itemId) return { status: 200, data: await input.service.sections(input.auth, workspaceId) };
  if (collection === "sections" && input.method === "GET" && itemId) return { status: 200, data: await input.service.section(input.auth, workspaceId, itemId) };
  if (collection === "sections" && input.method === "POST" && !itemId) return { status: 201, data: await input.service.createSection(input.auth, workspaceId, input.body) };
  if (collection === "sections" && input.method === "PATCH" && itemId) return { status: 200, data: await input.service.updateSection(input.auth, workspaceId, itemId, input.body) };
  if (collection === "decisions" && input.method === "GET" && !itemId) return { status: 200, data: await input.service.decisions(input.auth, workspaceId) };
  if (collection === "decisions" && input.method === "POST" && !itemId) return { status: 201, data: await input.service.createDecision(input.auth, workspaceId, input.body) };
  if (collection === "decisions" && input.method === "PATCH" && itemId) return { status: 200, data: await input.service.updateDecision(input.auth, workspaceId, itemId, input.body) };
  if (collection === "history" && input.method === "GET" && !itemId) return { status: 200, data: await input.service.history(input.auth, workspaceId) };
  return null;
}
