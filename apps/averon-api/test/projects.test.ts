import assert from "node:assert/strict";
import test from "node:test";
import { hashProjectAccessPassword, verifyProjectAccessPassword } from "../src/domains/projects/access-password.ts";
import type { EligiblePayment, ProjectRepository } from "../src/domains/projects/project.repository.ts";
import type { MilestoneRecord, ProjectRecord, ProjectWorkspace } from "../src/domains/projects/project.types.ts";
import { ProjectService } from "../src/domains/projects/project.service.ts";
import type { ProjectEmailSender } from "../src/domains/projects/project.email.ts";
import { request } from "./http-harness.ts";
import { InMemoryRateLimitStore, RateLimiter } from "../src/ai/emmy/rate-limiter.ts";

class MemoryProjects implements ProjectRepository {
  projects = new Map<string, ProjectRecord>(); messages: string[] = []; changes: string[] = []; emails: string[] = [];
  eligible = true;
  async findByContract(id: string) { return [...this.projects.values()].find((item) => item.contractId === id) ?? null; }
  async getOwned(id: string, customerId: string) { const item = this.projects.get(id); return item?.customerId === customerId ? item : null; }
  async listOwned(customerId: string) { return [...this.projects.values()].filter((item) => item.customerId === customerId); }
  async createFromPaidContract(payment: EligiblePayment, hash: string) { if (!this.eligible || await this.findByContract(payment.contractId)) return null; const item: ProjectRecord = { id: `project-${this.projects.size + 1}`, customerId: payment.customerId, customerEmail: "customer@example.com", contractId: payment.contractId, projectReference: `AVR-${this.projects.size + 1}`, title: "Customer platform", summary: "Signed scope", status: "active", progressPercent: 0, accessEnabled: true, accessPasswordHash: hash }; this.projects.set(item.id, item); return item; }
  async markEmail(id: string, status: "sent" | "failed") { this.emails.push(`${id}:${status}`); }
  async unlock(id: string, customerId: string) { const item = await this.getOwned(id, customerId); if (item) item.unlockedAt = new Date().toISOString(); }
  async workspace(id: string, customerId: string): Promise<ProjectWorkspace | null> { const item = await this.getOwned(id, customerId); if (!item?.unlockedAt) return null; const project = { ...item } as Partial<ProjectRecord>; delete project.customerId; delete project.customerEmail; delete project.accessPasswordHash; return { project: project as ProjectWorkspace["project"], milestones: [], messages: [], changeRequests: [], files: [], invoices: [], payments: [], contract: { id: item.contractId, status: "signed" } }; }
  async addMessage(id: string, customerId: string, body: string) { assert.ok((await this.getOwned(id, customerId))?.unlockedAt); this.messages.push(body); return "message-1"; }
  async addChangeRequest(id: string, customerId: string, input: { title: string }) { assert.ok((await this.getOwned(id, customerId))?.unlockedAt); this.changes.push(input.title); return "change-1"; }
  async submitSatisfaction(id: string, customerId: string, input: { satisfaction: "satisfied" | "not_satisfied" }) { const item = await this.getOwned(id, customerId); assert.ok(item?.completedAt); assert.equal(item.satisfaction, undefined); item.satisfaction = input.satisfaction; }
  async regenerate(id: string, hash: string) { const item = this.projects.get(id); if (!item) return null; item.accessPasswordHash = hash; item.unlockedAt = undefined; return item; }
  async updateAdmin(id: string, input: Record<string, unknown>) { Object.assign(this.projects.get(id)!, input); }
  async addMilestone(id: string, input: Omit<MilestoneRecord, "id" | "projectId">) { void id; void input; return "milestone-1"; }
}

class CaptureEmail implements ProjectEmailSender { sent: Array<{ accessPassword: string; portalUrl: string }> = []; async sendAccess(input: { accessPassword: string; portalUrl: string }) { this.sent.push(input); } }

test("project passwords are salted hashes and verify without storing plaintext", async () => {
  const first = await hashProjectAccessPassword("ValidPass123"); const second = await hashProjectAccessPassword("ValidPass123");
  assert.notEqual(first, second); assert.equal(first.includes("ValidPass123"), false); assert.equal(await verifyProjectAccessPassword("ValidPass123", first), true); assert.equal(await verifyProjectAccessPassword("wrong", first), false);
});

test("paid activation is idempotent and email delivery follows project creation", async () => {
  const repository = new MemoryProjects(); const email = new CaptureEmail(); const service = new ProjectService(repository, email, "https://averon.example/client-portal");
  const payment = { eventId: "evt-1", type: "paid" as const, customerId: "user-1", contractId: "contract-1", invoiceId: "invoice-1" };
  assert.equal(await service.activateFromPayment(payment), "activated"); assert.equal(await service.activateFromPayment({ ...payment, eventId: "evt-2" }), "duplicate");
  assert.equal(repository.projects.size, 1); assert.equal(email.sent.length, 1); assert.equal(email.sent[0].portalUrl, "https://averon.example/client-portal");
  assert.equal(await verifyProjectAccessPassword(email.sent[0].accessPassword, repository.projects.get("project-1")!.accessPasswordHash!), true);
});

test("project HTTP access is owner scoped and rate limited", async () => {
  const repository = new MemoryProjects(); const hash = await hashProjectAccessPassword("RightPass123");
  repository.projects.set("project-a", { id: "project-a", customerId: "user-1", customerEmail: "user@example.com", contractId: "contract-a", projectReference: "AVR-A", title: "A", summary: "A", status: "active", progressPercent: 15, accessEnabled: true, accessPasswordHash: hash });
  repository.projects.set("project-b", { id: "project-b", customerId: "other-user", customerEmail: "other@example.com", contractId: "contract-b", projectReference: "AVR-B", title: "B", summary: "B", status: "active", progressPercent: 10, accessEnabled: true, accessPasswordHash: hash });
  const list = await request("/api/v1/projects", { authorization: "Bearer valid", projectRepository: repository }); assert.equal((list.payload.data.items as unknown[]).length, 1);
  const denied = await request("/api/v1/projects/project-b/access/verify", { method: "POST", authorization: "Bearer valid", body: { accessPassword: "RightPass123" }, projectRepository: repository }); assert.equal(denied.status, 404);
  const limiter = new RateLimiter(new InMemoryRateLimitStore(), 1, 60_000, "PROJECT_ACCESS_RATE_LIMITED");
  const wrong = await request("/api/v1/projects/project-a/access/verify", { method: "POST", authorization: "Bearer valid", body: { accessPassword: "WrongPass123" }, projectRepository: repository, projectAccessRateLimiter: limiter }); assert.equal(wrong.status, 403);
  const limited = await request("/api/v1/projects/project-a/access/verify", { method: "POST", authorization: "Bearer valid", body: { accessPassword: "RightPass123" }, projectRepository: repository, projectAccessRateLimiter: limiter }); assert.equal(limited.status, 429);
});

test("unlocked workspaces support messages, change requests, and one-time completion feedback", async () => {
  const repository = new MemoryProjects(); const email = new CaptureEmail(); const hash = await hashProjectAccessPassword("RightPass123"); const service = new ProjectService(repository, email, "https://averon.example/client-portal");
  repository.projects.set("project-1", { id: "project-1", customerId: "user-1", customerEmail: "user@example.com", contractId: "contract-1", projectReference: "AVR-1", title: "A", summary: "A", status: "completed", progressPercent: 100, accessEnabled: true, accessPasswordHash: hash, completedAt: new Date().toISOString() });
  await service.verify("project-1", "user-1", "RightPass123"); await service.message("project-1", "user-1", "Hello"); await service.change("project-1", "user-1", { title: "Update", description: "Please update", category: "content", priority: "normal" }); await service.satisfaction("project-1", "user-1", { satisfaction: "satisfied" });
  assert.deepEqual(repository.messages, ["Hello"]); assert.deepEqual(repository.changes, ["Update"]); assert.equal(repository.projects.get("project-1")?.satisfaction, "satisfied");
});
