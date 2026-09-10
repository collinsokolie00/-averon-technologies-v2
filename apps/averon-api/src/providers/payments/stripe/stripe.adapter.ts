import Stripe from "stripe";
import { ApiError } from "../../../errors/api-error.ts";
import type { PaymentEvent, TrustedInvoice } from "../../../domains/payments/payment.types.ts";

export interface PaymentProvider {
  createCheckout(invoice: TrustedInvoice, urls: { success: string; cancel: string }, idempotencyKey: string): Promise<{ id: string; url: string }>;
  getCheckout(reference: string): Promise<{ id: string; url: string; reusable: boolean } | null>;
  verifyWebhook(rawBody: Buffer, signature: string): PaymentEvent;
}

let stripeClient: Stripe | undefined;
function client() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new ApiError(503, "PAYMENT_PROVIDER_UNAVAILABLE", "Payment provider configuration is unavailable.");
  const timeout = Number(process.env.STRIPE_TIMEOUT_MS ?? 20_000);
  return stripeClient ??= new Stripe(key, { timeout: Number.isFinite(timeout) ? timeout : 20_000, maxNetworkRetries: 0 });
}

export class StripePaymentProvider implements PaymentProvider {
  async getCheckout(reference: string) {
    try { const session = await client().checkout.sessions.retrieve(reference); return session.url ? { id: session.id, url: session.url, reusable: session.status === "open" && session.payment_status !== "paid" } : null; }
    catch { return null; }
  }
  async createCheckout(invoice: TrustedInvoice, urls: { success: string; cancel: string }, idempotencyKey: string) {
    try {
      const session = await client().checkout.sessions.create({
        mode: "payment",
        line_items: [{ quantity: 1, price_data: { currency: invoice.currency, unit_amount: invoice.amountCents, product_data: { name: invoice.title || `Averon contract deposit ${invoice.projectReference}` } } }],
        metadata: { customerId: invoice.customerId, contractId: invoice.contractId, invoiceId: invoice.invoiceId },
        success_url: `${urls.success}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: urls.cancel,
      }, { idempotencyKey });
      if (!session.url) throw new Error("Checkout URL missing");
      return { id: session.id, url: session.url };
    } catch { throw new ApiError(502, "CHECKOUT_CREATION_FAILED", "Unable to create the payment checkout."); }
  }
  verifyWebhook(rawBody: Buffer, signature: string): PaymentEvent {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) throw new ApiError(503, "PAYMENT_PROVIDER_UNAVAILABLE", "Webhook configuration is unavailable.");
    let event: Stripe.Event;
    try { event = client().webhooks.constructEvent(rawBody, signature, secret); }
    catch { throw new ApiError(400, "INVALID_WEBHOOK_SIGNATURE", "The webhook signature is invalid."); }
    const supported: Record<string, PaymentEvent["type"]> = {
      "checkout.session.completed": "paid", "checkout.session.async_payment_succeeded": "paid",
      "checkout.session.async_payment_failed": "failed", "checkout.session.expired": "expired",
    };
    const type = supported[event.type] ?? "unknown";
    if (type === "unknown") return { eventId: event.id, type };
    const session = event.data.object as Stripe.Checkout.Session;
    return { eventId: event.id, type, checkoutReference: session.id, invoiceId: session.metadata?.invoiceId, contractId: session.metadata?.contractId, customerId: session.metadata?.customerId, amountCents: session.amount_total ?? undefined, currency: session.currency ?? undefined };
  }
}
