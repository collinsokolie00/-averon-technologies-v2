import type { Firestore } from "firebase-admin/firestore";
import type { GuardianFinding, GuardianHealthReport, GuardianWebsite } from "@averon/shared-types";
import { getFirebaseAdminServices } from "../../services/firebase/admin.ts";
import { ApiError } from "../../errors/api-error.ts";

export interface GuardianRepository {
  listWebsites(workspaceId: string): Promise<GuardianWebsite[]>;
  getWebsite(workspaceId: string, websiteId: string): Promise<GuardianWebsite | null>;
  saveWebsite(website: GuardianWebsite): Promise<void>;
  saveReport(report: GuardianHealthReport): Promise<void>;
  getReport(workspaceId: string, reportId: string): Promise<GuardianHealthReport | null>;
  listFindings(workspaceId: string, websiteId: string): Promise<GuardianFinding[]>;
  getFinding(workspaceId: string, findingId: string): Promise<GuardianFinding | null>;
  upsertFinding(finding: GuardianFinding): Promise<GuardianFinding>;
  linkTask(workspaceId: string, findingId: string, fingerprint: string, taskId: string): Promise<GuardianFinding>;
  markNotObserved(workspaceId: string, websiteId: string, observedFingerprints: Set<string>): Promise<void>;
  resolveFinding(workspaceId: string, findingId: string, repairPlanId: string, verifiedRunId: string, resolvedAt: string): Promise<GuardianFinding>;
}

const key = (workspaceId: string, id: string) => `${workspaceId}__${id}`;
export class MemoryGuardianRepository implements GuardianRepository {
  websites = new Map<string, GuardianWebsite>(); reports = new Map<string, GuardianHealthReport>(); findings = new Map<string, GuardianFinding>();
  async listWebsites(workspaceId: string) { return [...this.websites.values()].filter((item) => item.workspaceId === workspaceId).map((item) => structuredClone(item)); }
  async getWebsite(workspaceId: string, websiteId: string) { return structuredClone(this.websites.get(key(workspaceId, websiteId)) ?? null); }
  async saveWebsite(item: GuardianWebsite) { this.websites.set(key(item.workspaceId, item.id), structuredClone(item)); }
  async saveReport(item: GuardianHealthReport) { this.reports.set(key(item.workspaceId, item.reportId), structuredClone(item)); }
  async getReport(workspaceId: string, reportId: string) { return structuredClone(this.reports.get(key(workspaceId, reportId)) ?? null); }
  async listFindings(workspaceId: string, websiteId: string) { return [...this.findings.values()].filter((item) => item.workspaceId === workspaceId && item.websiteId === websiteId).map((item) => structuredClone(item)); }
  async getFinding(workspaceId: string, findingId: string) { return structuredClone([...this.findings.values()].find((item) => item.workspaceId === workspaceId && item.findingId === findingId) ?? null); }
  async upsertFinding(item: GuardianFinding) { const id = key(item.workspaceId, item.fingerprint); const current = this.findings.get(id); const saved = current && current.status === "OPEN" ? { ...current, runId: item.runId, linkedRunIds: [...new Set([...current.linkedRunIds, item.runId])], lastSeenAt: item.lastSeenAt, occurrenceCount: current.occurrenceCount + 1, evidence: item.evidence, observedInLatestRun: true } : item; this.findings.set(id, structuredClone(saved)); return structuredClone(saved); }
  async linkTask(workspaceId: string, findingId: string, fingerprint: string, taskId: string) { const id = key(workspaceId, fingerprint); const current = this.findings.get(id); if (!current || current.findingId !== findingId) throw new Error("Guardian finding not found"); const saved = { ...current, maintenanceTaskId: taskId }; this.findings.set(id, structuredClone(saved)); return structuredClone(saved); }
  async markNotObserved(workspaceId: string, websiteId: string, observed: Set<string>) { for (const [id, item] of this.findings) if (item.workspaceId === workspaceId && item.websiteId === websiteId && item.status === "OPEN" && !observed.has(item.fingerprint)) this.findings.set(id, { ...item, observedInLatestRun: false }); }
  async resolveFinding(workspaceId: string, findingId: string, repairPlanId: string, verifiedRunId: string, resolvedAt: string) { const found = [...this.findings.entries()].find(([, item]) => item.workspaceId === workspaceId && item.findingId === findingId); if (!found) throw new ApiError(404, "GUARDIAN_FINDING_NOT_FOUND", "The Guardian finding was not found."); const saved = { ...found[1], status: "RESOLVED" as const, resolvedAt, resolvedByRepairPlanId: repairPlanId, verifiedRunId }; this.findings.set(found[0], saved); return structuredClone(saved); }
}

export class FirebaseGuardianRepository implements GuardianRepository {
  private readonly db: Firestore;
  constructor(db: Firestore = getFirebaseAdminServices().firestore) { this.db = db; }
  private websites() { return this.db.collection("guardianWebsites"); } private reports() { return this.db.collection("guardianReports"); } private findings() { return this.db.collection("guardianFindings"); }
  async listWebsites(workspaceId: string) { const found = await this.websites().where("workspaceId", "==", workspaceId).get(); return found.docs.map((doc) => doc.data() as GuardianWebsite); }
  async getWebsite(workspaceId: string, websiteId: string) { const found = await this.websites().doc(key(workspaceId, websiteId)).get(); const item = found.exists ? found.data() as GuardianWebsite : null; return item?.workspaceId === workspaceId ? item : null; }
  async saveWebsite(item: GuardianWebsite) { await this.websites().doc(key(item.workspaceId, item.id)).set(item, { merge: true }); }
  async saveReport(item: GuardianHealthReport) { await this.reports().doc(key(item.workspaceId, item.reportId)).set(item); }
  async getReport(workspaceId: string, reportId: string) { const found = await this.reports().doc(key(workspaceId, reportId)).get(); const item = found.exists ? found.data() as GuardianHealthReport : null; return item?.workspaceId === workspaceId ? item : null; }
  async listFindings(workspaceId: string, websiteId: string) { const found = await this.findings().where("workspaceId", "==", workspaceId).where("websiteId", "==", websiteId).get(); return found.docs.map((doc) => doc.data() as GuardianFinding); }
  async getFinding(workspaceId: string, findingId: string) { const found = await this.findings().where("workspaceId", "==", workspaceId).where("findingId", "==", findingId).limit(1).get(); return found.empty ? null : found.docs[0]!.data() as GuardianFinding; }
  async upsertFinding(item: GuardianFinding) { const ref = this.findings().doc(key(item.workspaceId, item.fingerprint)); return this.db.runTransaction(async (tx) => { const found = await tx.get(ref); const current = found.exists ? found.data() as GuardianFinding : undefined; const saved = current && current.status === "OPEN" ? { ...current, runId: item.runId, linkedRunIds: [...new Set([...current.linkedRunIds, item.runId])], lastSeenAt: item.lastSeenAt, occurrenceCount: current.occurrenceCount + 1, evidence: item.evidence, observedInLatestRun: true } : item; tx.set(ref, saved); return saved; }); }
  async linkTask(workspaceId: string, findingId: string, fingerprint: string, taskId: string) { const ref = this.findings().doc(key(workspaceId, fingerprint)); return this.db.runTransaction(async (tx) => { const found = await tx.get(ref); if (!found.exists || found.data()?.workspaceId !== workspaceId || found.data()?.findingId !== findingId) throw new Error("Guardian finding not found"); const saved = { ...(found.data() as GuardianFinding), maintenanceTaskId: taskId }; tx.update(ref, { maintenanceTaskId: taskId }); return saved; }); }
  async markNotObserved(workspaceId: string, websiteId: string, observed: Set<string>) { const found = await this.findings().where("workspaceId", "==", workspaceId).where("websiteId", "==", websiteId).where("status", "==", "OPEN").get(); const batch = this.db.batch(); for (const doc of found.docs) if (!observed.has(String(doc.data().fingerprint))) batch.update(doc.ref, { observedInLatestRun: false }); await batch.commit(); }
  async resolveFinding(workspaceId: string, findingId: string, repairPlanId: string, verifiedRunId: string, resolvedAt: string) { const found = await this.findings().where("workspaceId", "==", workspaceId).where("findingId", "==", findingId).limit(1).get(); if (found.empty) throw new ApiError(404, "GUARDIAN_FINDING_NOT_FOUND", "The Guardian finding was not found."); const ref = found.docs[0]!.ref; const saved = { ...(found.docs[0]!.data() as GuardianFinding), status: "RESOLVED" as const, resolvedAt, resolvedByRepairPlanId: repairPlanId, verifiedRunId }; await ref.update({ status: saved.status, resolvedAt, resolvedByRepairPlanId: repairPlanId, verifiedRunId }); return saved; }
}
