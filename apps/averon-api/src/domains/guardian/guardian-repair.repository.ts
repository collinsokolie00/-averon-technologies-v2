import type { Firestore } from "firebase-admin/firestore";
import type { GuardianRepairPlan } from "@averon/shared-types";
import { ApiError } from "../../errors/api-error.ts";
import { getFirebaseAdminServices } from "../../services/firebase/admin.ts";

export interface GuardianRepairPlanRepository {
  get(workspaceId: string, repairPlanId: string): Promise<GuardianRepairPlan | null>;
  create(plan: GuardianRepairPlan): Promise<GuardianRepairPlan>;
  update(workspaceId: string, repairPlanId: string, expectedVersion: number, next: GuardianRepairPlan): Promise<GuardianRepairPlan>;
}
const key = (workspaceId: string, id: string) => `${workspaceId}__${id}`;
export class MemoryGuardianRepairPlanRepository implements GuardianRepairPlanRepository {
  readonly plans = new Map<string, GuardianRepairPlan>();
  async get(workspaceId: string, id: string) { return structuredClone(this.plans.get(key(workspaceId, id)) ?? null); }
  async create(plan: GuardianRepairPlan) { const id = key(plan.workspaceId, plan.repairPlanId); const current = this.plans.get(id); if (current) return structuredClone(current); this.plans.set(id, structuredClone(plan)); return structuredClone(plan); }
  async update(workspaceId: string, id: string, expectedVersion: number, next: GuardianRepairPlan) { const record = key(workspaceId, id); const current = this.plans.get(record); if (!current) throw new ApiError(404, "GUARDIAN_REPAIR_PLAN_NOT_FOUND", "The Guardian repair plan was not found."); if (current.version !== expectedVersion) throw new ApiError(409, "GUARDIAN_REPAIR_PLAN_STALE", "The Guardian repair plan changed before this operation."); this.plans.set(record, structuredClone(next)); return structuredClone(next); }
}
export class FirebaseGuardianRepairPlanRepository implements GuardianRepairPlanRepository {
  private readonly db: Firestore; constructor(db: Firestore = getFirebaseAdminServices().firestore) { this.db = db; }
  private ref(workspaceId: string, id: string) { return this.db.collection("guardianRepairPlans").doc(key(workspaceId, id)); }
  async get(workspaceId: string, id: string) { const found = await this.ref(workspaceId, id).get(); const item = found.exists ? found.data() as GuardianRepairPlan : null; return item?.workspaceId === workspaceId ? item : null; }
  async create(plan: GuardianRepairPlan) { const ref = this.ref(plan.workspaceId, plan.repairPlanId); return this.db.runTransaction(async (tx) => { const found = await tx.get(ref); if (found.exists) return found.data() as GuardianRepairPlan; tx.create(ref, plan); return plan; }); }
  async update(workspaceId: string, id: string, expectedVersion: number, next: GuardianRepairPlan) { const ref = this.ref(workspaceId, id); return this.db.runTransaction(async (tx) => { const found = await tx.get(ref); if (!found.exists || found.data()?.workspaceId !== workspaceId) throw new ApiError(404, "GUARDIAN_REPAIR_PLAN_NOT_FOUND", "The Guardian repair plan was not found."); if (found.data()?.version !== expectedVersion) throw new ApiError(409, "GUARDIAN_REPAIR_PLAN_STALE", "The Guardian repair plan changed before this operation."); tx.set(ref, next); return next; }); }
}
