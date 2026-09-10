import type { WorkspaceNotification, WorkspaceNotificationStatus } from "@averon/shared-types";
import { getFirebaseAdminServices } from "../../services/firebase/admin.ts";

export interface WorkspaceNotificationRepository {
  get(id: string): Promise<WorkspaceNotification | null>;
  list(workspaceIds: Set<string>): Promise<WorkspaceNotification[]>;
  save(item: WorkspaceNotification): Promise<{ created: boolean }>;
  setStatus(id: string, status: WorkspaceNotificationStatus, readAt?: string): Promise<WorkspaceNotification>;
}

export class MemoryWorkspaceNotificationRepository implements WorkspaceNotificationRepository {
  readonly items = new Map<string, WorkspaceNotification>();
  async get(id: string) { return structuredClone(this.items.get(id) ?? null); }
  async list(workspaceIds: Set<string>) { return [...this.items.values()].filter((item) => workspaceIds.has(item.workspaceId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((item) => structuredClone(item)); }
  async save(item: WorkspaceNotification) { if (this.items.has(item.notificationId)) return { created: false }; this.items.set(item.notificationId, structuredClone(item)); return { created: true }; }
  async setStatus(id: string, status: WorkspaceNotificationStatus, readAt?: string) { const current = this.items.get(id); if (!current) throw new Error("NOTIFICATION_NOT_FOUND"); const updated = { ...current, status, ...(readAt ? { readAt } : { readAt: undefined }) }; this.items.set(id, updated); return structuredClone(updated); }
}

export class FirebaseWorkspaceNotificationRepository implements WorkspaceNotificationRepository {
  private readonly db;
  constructor(db = getFirebaseAdminServices().firestore) { this.db = db; }
  private collection() { return this.db.collection("workspaceNotifications"); }
  async get(id: string) { const snapshot = await this.collection().doc(id).get(); return snapshot.exists ? snapshot.data() as WorkspaceNotification : null; }
  async list(workspaceIds: Set<string>) { if (!workspaceIds.size) return []; const snapshots = await Promise.all([...workspaceIds].map((workspaceId) => this.collection().where("workspaceId", "==", workspaceId).get())); return snapshots.flatMap((snapshot) => snapshot.docs.map((doc) => doc.data() as WorkspaceNotification)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  async save(item: WorkspaceNotification) { const ref = this.collection().doc(item.notificationId); return this.db.runTransaction(async (tx) => { const existing = await tx.get(ref); if (existing.exists) return { created: false }; tx.create(ref, item); return { created: true }; }); }
  async setStatus(id: string, status: WorkspaceNotificationStatus, readAt?: string) { const ref = this.collection().doc(id); await ref.update({ status, readAt: readAt ?? null }); return (await ref.get()).data() as WorkspaceNotification; }
}
