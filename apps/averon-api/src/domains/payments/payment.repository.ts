import type { Firestore } from "firebase-admin/firestore";
import { ApiError } from "../../errors/api-error.ts";
import { getFirebaseAdminServices } from "../../services/firebase/admin.ts";
import type { PaymentEvent, PaymentStatus, TrustedInvoice } from "./payment.types.ts";

export interface PaymentRepository {
  getInvoice(invoiceId: string): Promise<TrustedInvoice | null>;
  recordCheckout(invoice: TrustedInvoice, checkoutReference: string): Promise<void>;
  getPaymentStatus(checkoutReference: string, customerId: string): Promise<{ status: PaymentStatus; contractId?: string; projectReference?: string } | null>;
  reconcile(event: PaymentEvent): Promise<"processed" | "duplicate" | "ignored">;
}
export class FirebasePaymentRepository implements PaymentRepository {
  private readonly db: Firestore;
  constructor(db: Firestore = getFirebaseAdminServices().firestore) { this.db = db; }
  private now() { return getFirebaseAdminServices().serverTimestamp(); }
  async getInvoice(invoiceId: string) {
    const found = await this.db.collection("invoices").doc(invoiceId).get(); if (!found.exists) return null;
    const data = found.data()!; return { invoiceId: found.id, contractId: data.contractId, customerId: data.customerId, projectReference: data.projectReference, title: data.title, amountCents: data.amountCents, currency: data.currency, status: data.status, checkoutReference: data.checkoutReference ?? data.stripeSessionId } as TrustedInvoice;
  }
  async recordCheckout(invoice: TrustedInvoice, checkoutReference: string) {
    const now = this.now(); const batch = this.db.batch();
    batch.set(this.db.collection("payments").doc(checkoutReference), { customerId: invoice.customerId, contractId: invoice.contractId, invoiceId: invoice.invoiceId, projectReference: invoice.projectReference, amountCents: invoice.amountCents, currency: invoice.currency, status: "pending", provider: "stripe", providerReference: checkoutReference, checkoutReference, stripeSessionId: checkoutReference, createdAt: now, updatedAt: now }, { merge: true });
    batch.set(this.db.collection("invoices").doc(invoice.invoiceId), { checkoutReference, stripeSessionId: checkoutReference, updatedAt: now }, { merge: true });
    batch.set(this.db.collection("auditLogs").doc(`payment-checkout-${checkoutReference}`), { actorId: invoice.customerId, action: "PAYMENT_CHECKOUT_CREATED", targetCollection: "payments", targetId: checkoutReference, detail: `Checkout created for invoice ${invoice.invoiceId}.`, createdAt: now }, { merge: true }); await batch.commit();
  }
  async getPaymentStatus(reference: string, customerId: string) {
    const found = await this.db.collection("payments").doc(reference).get(); const data = found.data(); if (!data || data.customerId !== customerId) return null;
    return { status: data.status, contractId: data.contractId, projectReference: data.projectReference };
  }
  async reconcile(event: PaymentEvent) {
    if (event.type === "unknown") return "ignored" as const;
    if (!event.invoiceId || !event.checkoutReference) throw new ApiError(400, "PAYMENT_RECONCILIATION_FAILED", "Payment identifiers are incomplete.");
    const invoiceId = event.invoiceId; const checkoutReference = event.checkoutReference; const eventType: PaymentStatus = event.type;
    return this.db.runTransaction(async (tx) => {
      const eventRef = this.db.collection("stripeEvents").doc(event.eventId); if ((await tx.get(eventRef)).exists) return "duplicate" as const;
      const invoiceRef = this.db.collection("invoices").doc(invoiceId); const invoice = await tx.get(invoiceRef); if (!invoice.exists) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment invoice was not found.");
      const expected = invoice.data()!;
      if (expected.customerId !== event.customerId || expected.contractId !== event.contractId || Number(expected.amountCents) !== event.amountCents || String(expected.currency).toLowerCase() !== event.currency?.toLowerCase()) throw new ApiError(409, "PAYMENT_AMOUNT_MISMATCH", "Payment reconciliation requires investigation.");
      const now = this.now(); const status = eventType;
      tx.set(this.db.collection("payments").doc(checkoutReference), { status, provider: "stripe", providerReference: checkoutReference, checkoutReference, updatedAt: now, ...(status === "paid" ? { paidAt: now } : {}) }, { merge: true });
      if (status === "paid") {
        tx.set(invoiceRef, { status: "paid", paidAt: now, updatedAt: now }, { merge: true });
        tx.set(this.db.collection("notifications").doc(), { customerId: event.customerId, title: "Payment received", body: `Invoice ${event.invoiceId} has been paid.`, status: "unread", createdAt: now, updatedAt: now });
      }
      tx.set(this.db.collection("auditLogs").doc(), { actorId: "stripe", action: status === "paid" ? "PAYMENT_SUCCEEDED" : status === "failed" ? "PAYMENT_FAILED" : "PAYMENT_CHECKOUT_EXPIRED", targetCollection: "payments", targetId: checkoutReference, detail: `Stripe event ${event.eventId} reconciled.`, createdAt: now });
      tx.create(eventRef, { processedAt: now, type: event.type, checkoutReference }); return "processed" as const;
    });
  }
}
