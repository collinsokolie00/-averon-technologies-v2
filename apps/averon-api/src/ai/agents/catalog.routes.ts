import type { AuthContext } from "../../services/auth/authentication.ts";
import type { AgentCatalogService } from "./catalog.ts";
export async function handleAgentCatalogRoute(input: { method: string; path: string; auth: AuthContext; service: AgentCatalogService }) { const match = /^\/api\/v1\/workspaces\/([^/]+)\/agents$/.exec(input.path); if (!match || input.method !== "GET") return null; return { status: 200, data: await input.service.list(input.auth, decodeURIComponent(match[1]!)) }; }
