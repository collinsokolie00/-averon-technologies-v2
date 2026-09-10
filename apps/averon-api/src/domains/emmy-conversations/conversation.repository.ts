import type { DocumentData, Firestore } from "firebase-admin/firestore";
import type { EmmyConversation, EmmyConversationMessage } from "@averon/shared-types";
import { getFirebaseAdminServices } from "../../services/firebase/admin.ts";
import type { ConversationRepository } from "./conversation.types.ts";

function record<T>(snapshot: { id: string; data(): DocumentData | undefined }): T { return { id: snapshot.id, ...snapshot.data() } as T; }
function millis(value: unknown) { return value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function" ? value.toMillis() : 0; }

export class FirebaseConversationRepository implements ConversationRepository {
  private readonly db: Firestore;
  constructor(db: Firestore = getFirebaseAdminServices().firestore) { this.db = db; }
  private collection() { return this.db.collection("emmyConversations"); }
  async create(userId: string, workspaceId: string | null) {
    const ref = this.collection().doc(); const now = getFirebaseAdminServices().serverTimestamp();
    await ref.create({ userId, workspaceId, title: "New conversation", status: "active", createdAt: now, updatedAt: now });
    return { id: ref.id, userId, workspaceId, title: "New conversation", status: "active" } as EmmyConversation;
  }
  async list(userId: string) {
    const result = await this.collection().where("userId", "==", userId).limit(100).get();
    return result.docs.map((item) => record<EmmyConversation>(item)).sort((a, b) => millis(b.updatedAt) - millis(a.updatedAt));
  }
  async get(id: string) { const found = await this.collection().doc(id).get(); return found.exists ? record<EmmyConversation>(found) : null; }
  async updateTitle(id: string, title: string) { await this.collection().doc(id).update({ title, updatedAt: getFirebaseAdminServices().serverTimestamp() }); }
  async listMessages(id: string) {
    const result = await this.collection().doc(id).collection("messages").orderBy("createdAt", "asc").limit(200).get();
    return result.docs.map((item) => record<EmmyConversationMessage>(item));
  }
  async appendMessage(id: string, message: Omit<EmmyConversationMessage, "id" | "conversationId" | "createdAt">) {
    const ref = this.collection().doc(id).collection("messages").doc(); const now = getFirebaseAdminServices().serverTimestamp();
    await this.db.runTransaction(async (tx) => { tx.create(ref, { ...message, conversationId: id, createdAt: now }); tx.update(this.collection().doc(id), { updatedAt: now }); });
    return { id: ref.id, conversationId: id, ...message } as EmmyConversationMessage;
  }
  async upsertActionMessage(id: string, actionId: string, message: Omit<EmmyConversationMessage, "id" | "conversationId" | "createdAt">) {
    const ref = this.collection().doc(id).collection("messages").doc(`action-${actionId.replace(/[^A-Za-z0-9._-]/g, "_")}`); const now = getFirebaseAdminServices().serverTimestamp();
    await this.db.runTransaction(async (tx) => { await tx.get(ref); tx.set(ref, { ...message, conversationId: id, createdAt: now }, { merge: true }); tx.update(this.collection().doc(id), { updatedAt: now }); });
    return { id: ref.id, conversationId: id, ...message } as EmmyConversationMessage;
  }
  async delete(id: string) { await this.db.recursiveDelete(this.collection().doc(id)); }
}
