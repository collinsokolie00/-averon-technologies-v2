import type { Firestore } from "firebase-admin/firestore";
import { ApiError } from "../../errors/api-error.ts";
import { getFirebaseAdminServices } from "../../services/firebase/admin.ts";
import type { AdminCollection, BusinessRecord, ContractAssignment, CustomerProfileInput, QuoteReply, QuoteSubmission } from "./business.types.ts";

export interface BusinessRepository {
  list(collection: AdminCollection, customerId?: string): Promise<BusinessRecord[]>;
  get(collection: AdminCollection, id: string): Promise<BusinessRecord | null>;
  createQuote(customerId: string | null, quote: QuoteSubmission): Promise<string>;
  replyToQuote(id: string, reply: QuoteReply, actorId: string, actorEmail?: string): Promise<void>;
  assignContract(input: ContractAssignment, actorId: string, actorEmail?: string): Promise<{ contractId: string; invoiceId: string; projectReference: string }>;
  markMessageRead(id: string, actorId: string, actorEmail?: string): Promise<void>;
  markNotificationRead(id: string, customerId: string): Promise<boolean>;
  listNotifications(customerId: string): Promise<BusinessRecord[]>;
  signContract(id: string, customerId: string, customerEmail: string | undefined, typedSignature: string): Promise<boolean>;
  upsertCustomerProfile(auth: { userId: string; email?: string; displayName?: string; emailVerified: boolean }, input: CustomerProfileInput): Promise<BusinessRecord>;
  customerPortal(customerId: string): Promise<{ profile: BusinessRecord | null; quotes: BusinessRecord[]; contracts: BusinessRecord[]; invoices: BusinessRecord[]; messages: BusinessRecord[]; notifications: BusinessRecord[] }>;
  createCustomerMessage(customerId: string, input: { subject: string; body: string }): Promise<string>;
  markCustomerMessageRead(id: string, customerId: string): Promise<boolean>;
}

export class FirebaseBusinessRepository implements BusinessRepository {
  private readonly db: Firestore;
  constructor(db: Firestore = getFirebaseAdminServices().firestore) { this.db = db; }
  private timestamp() { return getFirebaseAdminServices().serverTimestamp(); }
  private timestampMillis(value: unknown) { return value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function" ? value.toMillis() : 0; }
  async list(name: AdminCollection, customerId?: string) {
    try {
      const collection = this.db.collection(name);
      if (customerId) {
        const snapshot = await collection.where("customerId", "==", customerId).get();
        const items: BusinessRecord[] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return items.sort((left, right) => this.timestampMillis(right.createdAt) - this.timestampMillis(left.createdAt)).slice(0, 100);
      }
      const snapshot = await collection.orderBy("createdAt", "desc").limit(100).get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch { throw new ApiError(500, "DATABASE_ERROR", "Unable to retrieve business records."); }
  }
  async get(name: AdminCollection, id: string) {
    try { const doc = await this.db.collection(name).doc(id).get(); return doc.exists ? { id: doc.id, ...doc.data() } : null; }
    catch { throw new ApiError(500, "DATABASE_ERROR", "Unable to retrieve the business record."); }
  }
  async listNotifications(customerId: string) {
    try {
      const snapshot = await this.db.collection("notifications").where("customerId", "==", customerId).limit(100).get();
      const items: BusinessRecord[] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return items.sort((left, right) => this.timestampMillis(right.createdAt) - this.timestampMillis(left.createdAt));
    } catch { throw new ApiError(500, "DATABASE_ERROR", "Unable to retrieve notifications."); }
  }
  async createQuote(customerId: string | null, quote: QuoteSubmission) {
    const record = await this.db.collection("quotes").add({ ...quote, ...(customerId ? { customerId } : {}), source: customerId ? "customer_account" : "public_contact", status: "pending", createdAt: this.timestamp(), updatedAt: this.timestamp() }); return record.id;
  }
  async upsertCustomerProfile(auth: { userId: string; email?: string; displayName?: string; emailVerified: boolean }, input: CustomerProfileInput) {
    const ref = this.db.collection("users").doc(auth.userId);
    return this.db.runTransaction(async (tx) => {
      const found = await tx.get(ref); const existing = found.data() ?? {}; const now = this.timestamp();
      const profile = {
        uid: auth.userId,
        name: input.name || existing.name || auth.displayName || auth.email?.split("@")[0] || "Averon Customer",
        email: auth.email ?? "",
        company: input.company || existing.company || "Averon Customer",
        emailVerified: auth.emailVerified,
        portalStatus: existing.portalStatus === "active" ? "active" : "pending",
        authProvider: input.authProvider ?? existing.authProvider ?? "firebase",
        phone: input.phone ?? existing.phone ?? "",
        notificationPreference: input.notificationPreference ?? existing.notificationPreference ?? "important",
        communicationPreference: input.communicationPreference ?? existing.communicationPreference ?? "email",
        updatedAt: now,
        ...(found.exists ? {} : { createdAt: now }),
      };
      tx.set(ref, profile, { merge: true });
      return { id: auth.userId, ...profile };
    });
  }
  async customerPortal(customerId: string) {
    const [profile, quotes, contracts, invoices, messages, notifications] = await Promise.all([
      this.get("users", customerId), this.list("quotes", customerId), this.list("contracts", customerId), this.list("invoices", customerId), this.list("messages", customerId), this.listNotifications(customerId),
    ]);
    return { profile, quotes, contracts, invoices, messages, notifications };
  }
  async createCustomerMessage(customerId: string, input: { subject: string; body: string }) {
    const ref = await this.db.collection("messages").add({ customerId, subject: input.subject, body: input.body, senderRole: "customer", status: "open", createdAt: this.timestamp(), updatedAt: this.timestamp() });
    return ref.id;
  }
  async markCustomerMessageRead(id: string, customerId: string) {
    const ref = this.db.collection("messages").doc(id); const found = await ref.get();
    if (!found.exists || found.data()?.customerId !== customerId) return false;
    await ref.update({ status: "read", updatedAt: this.timestamp() }); return true;
  }
  async replyToQuote(id: string, reply: QuoteReply, actorId: string, actorEmail?: string) {
    await this.db.runTransaction(async (tx) => {
      const ref = this.db.collection("quotes").doc(id); const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new ApiError(404, "NOT_FOUND", "Quote was not found.");
      const quote = snapshot.data()!; const now = this.timestamp(); tx.update(ref, { ...reply, updatedAt: now });
      const message = this.db.collection("messages").doc(); tx.set(message, { customerId: quote.customerId, subject: `Quote update: ${quote.projectType}`, body: reply.adminReply, senderRole: "admin", status: "open", createdAt: now, updatedAt: now });
      const notification = this.db.collection("notifications").doc(); tx.set(notification, { customerId: quote.customerId, title: "Quote reply received", body: reply.adminReply, status: "unread", createdAt: now, updatedAt: now });
      tx.set(this.db.collection("auditLogs").doc(), { actorId, actorEmail: actorEmail ?? null, action: "quote_reply_updated", targetCollection: "quotes", targetId: id, detail: `Quote marked ${reply.status}.`, createdAt: now });
    });
  }
  async assignContract(input: ContractAssignment, actorId: string, actorEmail?: string) {
    const contract = this.db.collection("contracts").doc(); const invoice = this.db.collection("invoices").doc();
    const projectReference = `AVR-${new Date().getUTCFullYear()}-${contract.id.slice(0, 6).toUpperCase()}`; const now = this.timestamp();
    await this.db.runTransaction(async (tx) => {
      tx.set(contract, { ...input, status: "assigned", projectReference, contractVersion: "v1.0", createdAt: now, updatedAt: now });
      tx.set(invoice, { customerId: input.customerId, contractId: contract.id, projectReference, title: "Mandatory project deposit", amountCents: input.depositAmountCents, currency: input.currency, status: "issued", isDeposit: true, createdAt: now, updatedAt: now });
      tx.set(this.db.collection("notifications").doc(), { customerId: input.customerId, title: "Contract assigned", body: `Your contract ${projectReference} is ready for review.`, status: "unread", createdAt: now, updatedAt: now });
      tx.set(this.db.collection("auditLogs").doc(), { actorId, actorEmail: actorEmail ?? null, action: "contract_assigned", targetCollection: "contracts", targetId: contract.id, detail: `Assigned ${projectReference}.`, createdAt: now });
    });
    return { contractId: contract.id, invoiceId: invoice.id, projectReference };
  }
  async markMessageRead(id: string, actorId: string, actorEmail?: string) {
    const ref = this.db.collection("messages").doc(id); const found = await ref.get(); if (!found.exists) throw new ApiError(404, "NOT_FOUND", "Message was not found.");
    const batch = this.db.batch(); batch.update(ref, { status: "read", updatedAt: this.timestamp() }); batch.set(this.db.collection("auditLogs").doc(), { actorId, actorEmail: actorEmail ?? null, action: "message_marked_read", targetCollection: "messages", targetId: id, createdAt: this.timestamp() }); await batch.commit();
  }
  async markNotificationRead(id: string, customerId: string) {
    const ref = this.db.collection("notifications").doc(id); const found = await ref.get(); if (!found.exists || found.data()?.customerId !== customerId) return false;
    await ref.update({ status: "read", updatedAt: this.timestamp() }); return true;
  }
  async signContract(id: string, customerId: string, customerEmail: string | undefined, typedSignature: string) {
    const ref = this.db.collection("contracts").doc(id);
    return this.db.runTransaction(async (tx) => {
      const found = await tx.get(ref); if (!found.exists || found.data()?.customerId !== customerId) return false;
      tx.update(ref, { status: "signed", signedBy: customerId, typedSignature, signedAt: this.timestamp(), updatedAt: this.timestamp(), audit: { action: "contract_signed", customerId, customerEmail: customerEmail ?? null, contractVersion: found.data()?.contractVersion ?? "unknown", recordedAt: new Date().toISOString() } }); return true;
    });
  }
}
