export type PaymentStatus = "pending" | "paid" | "failed" | "expired";
export interface CheckoutRequest { invoiceId: string }
export interface CheckoutResult { checkoutUrl: string; checkoutReference: string; reused: boolean }
export interface PaymentEvent {
  eventId: string; type: "paid" | "failed" | "expired" | "unknown"; checkoutReference?: string;
  invoiceId?: string; contractId?: string; customerId?: string; amountCents?: number; currency?: string;
}
export interface TrustedInvoice {
  invoiceId: string; contractId: string; customerId: string; projectReference: string; title: string;
  amountCents: number; currency: "eur" | "usd"; status: string; checkoutReference?: string;
}
