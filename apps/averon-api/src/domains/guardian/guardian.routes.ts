import type { AuthContext } from "../../services/auth/authentication.ts";
import type { GuardianService } from "./guardian.service.ts";

export async function handleGuardianRoute(input: { method: string; path: string; body?: unknown; auth: AuthContext; requestId: string; service: GuardianService }) {
  const websites = /^\/api\/v1\/workspaces\/([^/]+)\/guardian\/websites$/.exec(input.path);
  if (websites && input.method === "GET") return { status: 200, data: { items: await input.service.listWebsites(input.auth, decodeURIComponent(websites[1])) } };
  const inspect = /^\/api\/v1\/workspaces\/([^/]+)\/guardian\/websites\/([^/]+)\/inspections$/.exec(input.path);
  if (inspect && input.method === "POST") return { status: 201, data: await input.service.inspect(input.auth, decodeURIComponent(inspect[1]), decodeURIComponent(inspect[2]), input.requestId) };
  const findings = /^\/api\/v1\/workspaces\/([^/]+)\/guardian\/websites\/([^/]+)\/findings$/.exec(input.path);
  if (findings && input.method === "GET") return { status: 200, data: { items: await input.service.listFindings(input.auth, decodeURIComponent(findings[1]), decodeURIComponent(findings[2])) } };
  const report = /^\/api\/v1\/workspaces\/([^/]+)\/guardian\/reports\/([^/]+)$/.exec(input.path);
  if (report && input.method === "GET") return { status: 200, data: await input.service.getReport(input.auth, decodeURIComponent(report[1]), decodeURIComponent(report[2])) };
  const createPlan = /^\/api\/v1\/workspaces\/([^/]+)\/guardian\/findings\/([^/]+)\/repair-plans$/.exec(input.path);
  if (createPlan && input.method === "POST") { const body = input.body as { reportId?: string; authorizedActionId?: string }; if (!body?.reportId) throw new Error("reportId is required"); return { status: 201, data: await input.service.repairService().create(input.auth, decodeURIComponent(createPlan[1]), decodeURIComponent(createPlan[2]), body.reportId, input.requestId, body.authorizedActionId) }; }
  const plan = /^\/api\/v1\/workspaces\/([^/]+)\/guardian\/repair-plans\/([^/]+)(?:\/(approve|reject|execute|rollback))?$/.exec(input.path);
  if (plan) { const workspaceId = decodeURIComponent(plan[1]); const id = decodeURIComponent(plan[2]); const action = plan[3]; const body = (input.body ?? {}) as { expectedVersion?: number }; if (!action && input.method === "GET") return { status: 200, data: await input.service.repairService().get(input.auth, workspaceId, id) }; if (input.method === "POST" && action === "approve") return { status: 200, data: await input.service.repairService().approve(input.auth, workspaceId, id, Number(body.expectedVersion), input.requestId) }; if (input.method === "POST" && action === "reject") return { status: 200, data: await input.service.repairService().reject(input.auth, workspaceId, id, Number(body.expectedVersion), input.requestId) }; if (input.method === "POST" && action === "execute") return { status: 200, data: await input.service.repairService().execute(input.auth, workspaceId, id, input.requestId) }; if (input.method === "POST" && action === "rollback") return { status: 200, data: await input.service.repairService().rollback(input.auth, workspaceId, id, input.requestId) }; }
  return null;
}
